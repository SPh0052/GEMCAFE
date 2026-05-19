"""
STEP 2 — 케이크 이미지 자동 분석 (Gemini 2.5 Pro via SSAFY GMS).

이미지 한 장 입력 → 케이크 구성요소(cream, topping, coating 등) JSON 추출.
이 결과는 STEP 3(focus 선택)에서 UI에 띄울 옵션을 만드는 데 사용됨.

이전엔 Moondream3-preview (fal.ai) 를 썼으나 fine-grained 음식 식별 정확도가
부족 (예: 망고 큐브를 "yellow_cake_blocks" 같은 시각 묘사로 회피) 해서
Gemini 2.5 Pro (GMS 게이트웨이 경유) 로 교체. output JSON 스키마와 파일 구성,
함수 시그니처는 모두 그대로 유지되어 downstream (generate_keyframe / pipeline /
prompt_builder) 은 변경 없이 그대로 작동.

실행:
    1) GMS_KEY 환경변수 설정 (.env에 GMS_KEY=...)
    2) 아래 INPUT_IMAGE_PATH를 본인 케이스에 맞게 수정
    3) python analyze.py
"""
import io
import json
import os
import re
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from PIL import Image, ImageOps
from google.genai import types as genai_types

# llm_client 의 GMS 게이트웨이 클라이언트를 재사용 (base_url=GMS 가 박혀있음)
from llm_client import _get_client

load_dotenv()

# =====================================================================
# 설정
# =====================================================================
# 분석용 비전 모델 — GMS 가 제공하는 멀티모달 Gemini 2.5 Pro
GEMINI_VISION_MODEL = "gemini-2.5-pro"

INPUT_IMAGE_PATH = "./test_cake.jpg"
OUTPUT_DIR = "outputs"

# 분석 프롬프트 (few-shot, JSON 강제)
ANALYSIS_PROMPT = """You are a dessert image analyzer for a cafe advertising service.
Analyze this cake image and extract its components.

EXAMPLES of expected output:

Example 1 (a strawberry shortcake with whipped cream):
{
"cake_type": "layered_cream",
"base": ["vanilla_sponge"],
"creams": ["whipped_cream"],
"toppings": ["strawberry"],
"coating": "whipped_cream_coating",
"key_feature": "fresh strawberries on white whipped cream",
"is_warm": false,
"is_layered": true,
"element_textures": {
  "whipped_cream": "soft billowy peaks, freshly piped",
  "sponge": "very moist, almost syrup-soaked",
  "strawberry": "juicy fresh slices with glistening cut faces"
},
"suggested_focus": ["fresh_strawberries", "fluffy_whipped_cream", "soft_sponge_layers"]
}

Example 2 (a chocolate lava cake):
{
"cake_type": "chocolate",
"base": ["chocolate_sponge"],
"creams": ["molten_chocolate"],
"toppings": ["powdered_sugar"],
"coating": "none",
"key_feature": "molten chocolate center",
"is_warm": true,
"is_layered": false,
"element_textures": {
  "molten_chocolate": "thin freely flowing molten center, immediately oozing on contact",
  "chocolate_sponge": "tender thin shell barely containing the molten core"
},
"suggested_focus": ["molten_center", "warm_steam", "rich_chocolate"]
}

Example 3 (a tiramisu):
{
"cake_type": "tiramisu",
"base": ["ladyfinger_biscuit"],
"creams": ["mascarpone_cream"],
"toppings": ["cocoa_powder"],
"coating": "none",
"key_feature": "dusted cocoa powder on mascarpone",
"is_warm": false,
"is_layered": true,
"element_textures": {
  "mascarpone_cream": "airy spoonable mascarpone, holds soft shape",
  "ladyfinger_biscuit": "deeply coffee-soaked, very moist almost custard-like"
},
"suggested_focus": ["cocoa_dusting", "mascarpone_texture", "coffee_soaked_layers"]
}

Example 4 (a Basque-style baked cheesecake — runny custard interior):
{
"cake_type": "basque_cheesecake",
"base": ["baked_cheese"],
"creams": [],
"toppings": [],
"coating": "none",
"key_feature": "caramelized burnt top with softly oozing creamy interior",
"is_warm": false,
"is_layered": false,
"element_textures": {
  "baked_cheese": "softly oozing creamy half-baked interior, gently flowing when cut"
},
"suggested_focus": ["baked_cheese", "caramelized_top", "creamy_interior"]
}

Example 5 (a decorated layered cake with firm piped whipped cream — stabilized style, NOT freshly billowy):
{
"cake_type": "layered_cream",
"base": ["vanilla_sponge"],
"creams": ["whipped_cream"],
"toppings": ["strawberry"],
"coating": "whipped_cream_coating",
"key_feature": "sharp piped rosettes of firm stabilized whipped cream",
"is_warm": false,
"is_layered": true,
"element_textures": {
  "whipped_cream": "firm stabilized piped rosettes holding sharp ridges and crisp edges, NOT freshly soft",
  "vanilla_sponge": "tight even crumb, moderately moist, holds clean cut",
  "strawberry": "whole halved berries with bright glossy cut faces"
},
"suggested_focus": ["stabilized_cream", "piped_rosettes", "vanilla_sponge"]
}

=== ELEMENT NAMING RULES (STRICT) ===

For the data fields (base, creams, toppings, coating), output ONLY these
canonical element keys. If the visible element doesn't exactly match a key,
use the closest semantic match from this list:

  Creams/fillings: whipped_cream, cream, mascarpone_cream, ganache, molten_chocolate
  Sponge/base:     sponge, vanilla_sponge, chocolate_sponge, ladyfinger_biscuit, mousse, baked_cheese
  Toppings:        strawberry, blueberry, mango, powdered_sugar, cocoa_powder
  Coating:         whipped_cream_coating, mirror_glaze, none

Mapping examples (right side is what you MUST output):
  - "mango cubes" / "diced mango" / "mango jelly cubes" → mango
  - "fresh strawberries" / "strawberry slices" → strawberry
  - "vanilla sponge layers" / "yellow sponge cake" → vanilla_sponge
  - "fluffy whipped cream" / "white cream" → whipped_cream
  - "basque cheesecake" / "new york cheesecake" / "souffle cheesecake" /
    "cheesecake filling" / "cream cheese filling" → baked_cheese
    (single-layer baked cheese — for Basque/New York/souffle style; goes in "base")

Do NOT invent new descriptors like "yellow_cake_blocks", "fresh_mango_pieces",
"mango_jelly_cubes" for these four fields. Use ONLY the canonical keys above.

(The "suggested_focus" field is allowed to use descriptive labels — those are
user-facing options shown in the UI.)

=== ELEMENT_TEXTURES RULES (IMPORTANT) ===

The "element_textures" field captures the SPECIFIC TEXTURE VARIATION you
observe in THIS image for each visible element. Different cakes of the same
type can have very different textures — e.g. a Basque cheesecake can be
runny/oozing, dense/fudgy, or somewhere in between. A whipped cream can be
billowy fresh peaks or stabilized firm rosettes. Sponge can be dry crumbly
or syrup-soaked moist.

EVERY cake type — not just cheesecake — has instance-level variation.
Describe each visible element along these axes whenever applicable:
  - consistency:   runny ↔ creamy/spoonable ↔ dense/firm ↔ stiff
  - moisture:      dry crumbly ↔ moist ↔ deeply soaked
  - surface look:  glossy/wet ↔ matte ↔ rough/grainy
  - aeration:      airy/billowy ↔ medium ↔ compact/dense
  - structure:     barely-holds-shape ↔ holds-soft-shape ↔ holds-clean-cut-edges

Visual cues to read:
  - cut face is rounded/bulging vs sharp vertical → softer vs firmer
  - glossy reflective vs matte surface → wetter vs drier
  - color saturation, crumb size, edge crispness, surface tension

Rules:
- Keys MUST match the canonical element keys used in base/creams/toppings
  above (whipped_cream, sponge, baked_cheese, etc.). Use the SAME key.
- Values are ONE short English phrase (max ~15 words) describing the
  instance-specific texture variation visible in THIS image — focus on
  consistency (runny/dense), moisture, viscosity, density, surface
  characteristics.
- Only include elements actually visible in the image. Skip elements you
  cannot judge texture of (e.g. coating you cannot see inside of).
- Do NOT restate the element's identity ("whipped cream" / "cheese"). The
  baseline already handles identity — your job is the per-instance variation.
- VOCABULARY RULE: For whipped_cream and similar dairy creams, NEVER use
  "stretch", "strand", "string", or "pull" — cream does not stretch. Use
  words like "billowy", "soft peaks", "glossy", "dollops" instead. Stretching
  vocabulary is reserved for genuinely ductile substances (mozzarella,
  molten chocolate strings, etc.).

If you genuinely cannot judge texture variation, output element_textures: {}.

=== CRITICAL — DO NOT COPY EXAMPLES ===

The example outputs above are FORMAT references, not answer keys. Two different
basque cheesecake photos must produce DIFFERENT element_textures phrases.
Even if the input image visually resembles an example, you MUST:
  - Describe what YOU actually observe in the provided image (not the example)
  - Use the 5 axes and visual cues above as your observation framework
  - Compose a NEW phrase using vocabulary from the axes — do NOT verbatim
    re-use phrases like "softly oozing creamy half-baked interior" unless
    the image truly shows that exact state.

If you find yourself about to copy an example's element_textures phrase,
stop and re-examine the actual pixels. Same cake type ≠ same texture.

Now analyze the provided image. Output ONLY valid JSON in the same schema, no other text."""


# =====================================================================
# 핵심 함수
# =====================================================================
# GMS 게이트웨이가 일정 픽셀 수 / 비표준 JPEG 인코딩을 multimodal 요청에서 거부하는
# 케이스가 관찰됨 (804x1042 실패 / 400x533 성공). 거부 동작이 비결정적이라
# 같은 이미지도 시점에 따라 통과/실패가 갈림 → 큰 사이즈부터 시도해 실패 시
# 자동으로 더 작은 사이즈로 재시도하는 fallback 체인을 둔다.
#   - 1024px: 인식 품질 가장 좋음 (정상 케이스)
#   - 768px:  중간 단계 (1024 거부 시 첫 재시도)
#   - 512px:  안전선 (400x533 성공 기록 기반, 거의 항상 통과)
FALLBACK_LONG_EDGE_PX = [1024, 768, 512]
MAX_LONG_EDGE_PX = FALLBACK_LONG_EDGE_PX[0]   # 기본 / 디스플레이용


def _normalize_image_for_gemini(image_path: str, max_edge: int = MAX_LONG_EDGE_PX) -> tuple[bytes, str]:
    """
    입력 이미지를 GMS / Gemini multimodal 친화적 표준 JPEG 로 재인코딩.

    적용 변환:
      - EXIF orientation 적용 후 metadata 제거 (회전 정보가 파서 깨뜨릴 위험 차단)
      - 비RGB 색공간 (CMYK / RGBA / palette) 을 RGB 로 변환
      - 긴 변을 max_edge 이하로 리사이즈 (LANCZOS 필터)
      - JPEG quality=90 + optimize 로 재인코딩 (인코더 quirk 정규화)

    Returns: (jpeg_bytes, "image/jpeg")
    """
    img = Image.open(image_path)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")

    long_edge = max(img.size)
    if long_edge > max_edge:
        ratio = max_edge / long_edge
        new_size = (round(img.size[0] * ratio), round(img.size[1] * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90, optimize=True)
    return buf.getvalue(), "image/jpeg"


def analyze_with_gemini(image_path: str, prompt: str) -> tuple[dict, str, dict]:
    """
    Gemini 2.5 Pro (SSAFY GMS 게이트웨이 경유) 로 이미지 분석.

    Args:
        image_path: 로컬 이미지 파일 경로 (Gemini 는 bytes 를 직접 받음).
        prompt:     few-shot 예시가 포함된 분석 지시문.

    Returns:
        (parsed_dict, raw_text, full_response)
          - parsed_dict:    raw_text 에서 추출한 정형 JSON dict
          - raw_text:       모델의 원본 텍스트 응답 (사고 흐름 포함 가능)
          - full_response:  디버깅용 메타 dict (모델명/사용 토큰 등)

    동작 흐름:
      1) 이미지 파일을 bytes 로 읽기
      2) llm_client._get_client() 로 GMS base_url 박힌 클라이언트 획득
      3) 멀티모달 generate_content 호출 (이미지 Part + 텍스트 프롬프트)
      4) 응답 텍스트에서 JSON 추출
    """
    print(f"[1/1] Gemini 2.5 Pro 이미지 분석 중... ({GEMINI_VISION_MODEL})")
    print(f"      prompt: {len(prompt):,} chars")

    client = _get_client()

    # GMS 게이트웨이가 큰 사이즈를 비결정적으로 거부하는 경우 대비
    # 1024 → 768 → 512 순으로 fallback 재시도.
    response = None
    image_bytes: bytes = b""
    mime_type = "image/jpeg"
    used_edge = FALLBACK_LONG_EDGE_PX[0]
    last_error: Exception | None = None

    for attempt_idx, max_edge in enumerate(FALLBACK_LONG_EDGE_PX, start=1):
        image_bytes, mime_type = _normalize_image_for_gemini(image_path, max_edge=max_edge)
        attempt_label = f"      [시도 {attempt_idx}/{len(FALLBACK_LONG_EDGE_PX)}] ≤{max_edge}px"
        print(f"{attempt_label}: {len(image_bytes):,} bytes ({mime_type})")

        # 명시적 Content + Part 구조로 직렬화. GMS 게이트웨이가 SDK 의 자동 변환
        # ([Part, str] → Content) 결과를 제대로 못 forward 하는 경우 대비.
        content_payload = genai_types.Content(
            role="user",
            parts=[
                genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                genai_types.Part.from_text(text=prompt),
            ],
        )

        try:
            response = client.models.generate_content(
                model=GEMINI_VISION_MODEL,
                contents=[content_payload],
                config=genai_types.GenerateContentConfig(
                    # 0.2 는 결정성이 너무 강해 few-shot 예시 문구를 그대로 베끼는
                    # 경향이 있어 0.4 로 상향. 정형 필드(cake_type/base/creams 등)
                    # 는 schema 강제로 안정성 유지되고, element_textures 만 인스턴스
                    # 별로 자연스럽게 변형되도록 함.
                    temperature=0.4,
                    # JSON-only 출력 강제 — ```json ... ``` 펜스와 부가 설명 제거,
                    # 출력 토큰 절약 + 파싱 안정성↑ (모델 내부 추론 품질엔 영향 없음)
                    response_mime_type="application/json",
                ),
            )
            used_edge = max_edge
            break  # 성공
        except Exception as e:
            last_error = e
            print(f"        → 실패 ({type(e).__name__}): {str(e)[:200]}")
            if attempt_idx < len(FALLBACK_LONG_EDGE_PX):
                print(f"        → 더 작은 사이즈로 재시도")
                continue
            # 마지막 시도까지 실패 시 디버깅 정보 출력 후 에러 전파
            print(f"\n[ERROR] Gemini API 호출 모든 fallback 실패")
            print(f"        model: {GEMINI_VISION_MODEL}")
            print(f"        tried sizes: {FALLBACK_LONG_EDGE_PX}")
            print(f"        last error type: {type(e).__name__}")
            print(f"        last error:      {e}")
            raise

    assert response is not None  # 위에서 break 했으면 보장됨

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError(
            f"Gemini 2.5 Pro 응답이 비어있음. response={response!r}"
        )

    print(f"      → 원시 응답 (앞 300자): {text[:300]}...")

    # 응답에서 JSON 부분만 추출 (모델이 ```json ... ``` 같은 펜스 붙일 수 있음)
    parsed = extract_json(text)

    # 후처리: 물성이 크림 같은 base 요소(바스크 등)를 creams 에도 미러링
    # → FE 카테고리 필터(creams 비어있는지)를 통과시켜 cream_scoop / smash / hand_split
    #   같은 cream 시뮬레이션이 사용자에게 노출되도록 함.
    # FE/BE/Infra 무수정으로 해결하기 위한 AI 측 후처리.
    parsed = _augment_creamy_bases(parsed)

    # full_response: SDK 가 돌려주는 객체는 JSON 직렬화가 까다로워 디버그용 dict 로 정리
    full_response = {
        "model": GEMINI_VISION_MODEL,
        "image_path": image_path,
        "image_mime_type": mime_type,
        "image_size_bytes": len(image_bytes),
        "image_max_long_edge_px": used_edge,
        "raw_text": text,
        "usage_metadata": (
            response.usage_metadata.model_dump()
            if getattr(response, "usage_metadata", None) is not None
            and hasattr(response.usage_metadata, "model_dump")
            else None
        ),
    }
    return parsed, text, full_response


# 물성이 크림 같은 base 요소 → creams 에 미러링할 때 사용할 키 매핑.
# 의미적으로 base이지만 (반죽 자체가 본체) 식감이 크림처럼 부드러워 cream 시뮬레이션
# 적용이 자연스러운 케이크들. 미러 키는 FE KEYWORD_LABELS 와 AI ELEMENT_ALIASES
# 양쪽에 이미 등록된 정식 키만 사용 — 추가 코드 없이 라벨/정규화가 정상 작동.
#   - baked_cheese → creamy_interior  (FE 라벨 "크리미한 내부", AI alias → baked_cheese)
#   - mousse       → mousse           (FE 라벨 "무스", base/creams 양쪽 자연스러움)
#
# ⚠️ 외부 의존성:
#   1) FE: gemcafe/FE/src/features/create-video/catalog.ts 의 KEYWORD_LABELS
#      에 미러 키(creamy_interior, mousse)가 등록되어 있어야 사용자 화면에 한국어
#      라벨이 표시됨. 라벨이 사라지면 영문 폴백 ("Creamy Interior") 으로 표시.
#   2) AI: prompt_locks.py 의 ELEMENT_ALIASES 에 미러 키가 정식 base 키로 정규화
#      되도록 등록되어 있어야 슬롯 빌드·텍스처 매핑이 정확히 동작
#      (creamy_interior → baked_cheese).
# 위 두 곳을 변경할 때 이 매핑도 함께 검토 필요.
_CREAMY_BASE_MIRROR_TO_CREAMS = {
    "baked_cheese":  "creamy_interior",
    "mousse":        "mousse",
}


def _augment_creamy_bases(analysis: dict) -> dict:
    """
    분석 결과 후처리 — 물성이 크림 같은 base 요소를 creams 배열에도 추가.

    바스크/뉴욕/수플레 치즈케이크나 무스 케이크는 반죽 자체가 본체이므로 의미적으로는
    base 이지만, 텍스처가 크림처럼 부드러워 cream_scoop / smash / hand_split 같은
    cream 시뮬레이션을 사용자가 선택할 수 있어야 한다.

    FE 카테고리 필터는 analysis.creams 배열이 비어있으면 cream 시뮬레이션을 숨기므로,
    여기서 미러 키를 creams 에 추가해 필터를 통과시킨다. 미러 키는 ELEMENT_ALIASES 로
    base 요소와 같은 정식 키(예: baked_cheese)로 정규화되므로 내부 prompt 빌드와 텍스처
    매핑은 정확히 base 와 동일하게 동작한다.
    """
    if not isinstance(analysis, dict):
        return analysis
    base = analysis.get("base") or []
    creams = analysis.get("creams") or []
    if not isinstance(base, list) or not isinstance(creams, list):
        return analysis

    creams_set = set(creams)
    for b in base:
        mirror = _CREAMY_BASE_MIRROR_TO_CREAMS.get(b)
        if mirror and mirror not in creams_set:
            creams.append(mirror)
            creams_set.add(mirror)
    analysis["creams"] = creams
    return analysis


def extract_json(text: str) -> dict:
    """모델 출력에서 JSON 객체만 뽑아 dict로 파싱."""
    # 1) 코드 펜스 제거 시도
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    else:
        # 2) 첫 { 부터 마지막 } 까지
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start:end + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"JSON 파싱 실패: {e}\n원시 텍스트:\n{text[:1000]}"
        )


# =====================================================================
# 메인
# =====================================================================
def main():
    if not os.environ.get("GMS_KEY"):
        raise SystemExit("GMS_KEY 미설정. .env 에 추가하세요.")
    if not os.path.exists(INPUT_IMAGE_PATH):
        raise SystemExit(f"입력 이미지가 없습니다: {INPUT_IMAGE_PATH}")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(OUTPUT_DIR) / f"analyze_{ts}"
    run_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n결과 저장 폴더: {run_dir}\n")

    analysis, raw_text, full_response = analyze_with_gemini(INPUT_IMAGE_PATH, ANALYSIS_PROMPT)

    # 파일로 저장 (3종 모두 보존)
    #   analysis.json       — 정형 JSON (다운스트림에서 사용)
    #   raw_response.txt    — Gemini 원본 텍스트 응답 (사고 흐름 포함 가능)
    #   full_response.json  — 메타데이터 (모델/이미지 정보/usage 토큰 디버깅용)
    output_path = run_dir / "analysis.json"
    output_path.write_text(
        json.dumps(analysis, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    raw_path = run_dir / "raw_response.txt"
    raw_path.write_text(raw_text, encoding="utf-8")

    full_path = run_dir / "full_response.json"
    full_path.write_text(
        json.dumps(full_response, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )

    # 콘솔 출력 (보기 좋게)
    print("\n" + "=" * 60)
    print("Gemini 2.5 Pro 분석 결과 (정형 JSON)")
    print("=" * 60)
    print(json.dumps(analysis, indent=2, ensure_ascii=False))
    print("=" * 60)
    print(f"저장: {output_path}")
    print(f"저장: {raw_path}        ← 모델 사고 흐름 포함 가능")
    print(f"저장: {full_path}      ← 메타데이터 (모델/이미지/usage 토큰)")

    # STEP 3 미리보기 — suggested_focus 옵션
    if "suggested_focus" in analysis:
        print(f"\n[STEP 3 후보 (suggested_focus)]")
        for i, focus in enumerate(analysis["suggested_focus"], 1):
            print(f"  {i}. {focus}")


if __name__ == "__main__":
    main()
