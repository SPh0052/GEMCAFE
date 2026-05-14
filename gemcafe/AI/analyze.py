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
"suggested_focus": ["cocoa_dusting", "mascarpone_texture", "coffee_soaked_layers"]
}

Example 4 (a Basque-style baked cheesecake):
{
"cake_type": "basque_cheesecake",
"base": ["baked_cheese"],
"creams": [],
"toppings": [],
"coating": "none",
"key_feature": "caramelized burnt top with creamy interior",
"is_warm": false,
"is_layered": false,
"suggested_focus": ["baked_cheese", "caramelized_top", "creamy_interior"]
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

Now analyze the provided image. Output ONLY valid JSON in the same schema, no other text."""


# =====================================================================
# 핵심 함수
# =====================================================================
# GMS 게이트웨이가 일정 픽셀 수 / 비표준 JPEG 인코딩을 multimodal 요청에서 거부하는
# 케이스가 관찰됨 (804x1042 실패 / 400x533 성공). 어떤 이미지가 와도 안전하게
# 통과하도록 분석 전 표준 JPEG 으로 정규화한다.
MAX_LONG_EDGE_PX = 1024   # 긴 변 1024px 로 제한 (≈1M pixels 이하 보장)


def _normalize_image_for_gemini(image_path: str) -> tuple[bytes, str]:
    """
    입력 이미지를 GMS / Gemini multimodal 친화적 표준 JPEG 로 재인코딩.

    적용 변환:
      - EXIF orientation 적용 후 metadata 제거 (회전 정보가 파서 깨뜨릴 위험 차단)
      - 비RGB 색공간 (CMYK / RGBA / palette) 을 RGB 로 변환
      - 긴 변을 MAX_LONG_EDGE_PX 이하로 리사이즈 (LANCZOS 필터)
      - JPEG quality=90 + optimize 로 재인코딩 (인코더 quirk 정규화)

    Returns: (jpeg_bytes, "image/jpeg")
    """
    img = Image.open(image_path)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")

    long_edge = max(img.size)
    if long_edge > MAX_LONG_EDGE_PX:
        ratio = MAX_LONG_EDGE_PX / long_edge
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
    # 입력 이미지를 정규화 (긴 변 1024px / 표준 JPEG / metadata 제거) — GMS 거부 회피
    image_bytes, mime_type = _normalize_image_for_gemini(image_path)
    print(f"      image: {len(image_bytes):,} bytes ({mime_type}, normalized ≤{MAX_LONG_EDGE_PX}px)")
    print(f"      prompt: {len(prompt):,} chars")

    # 명시적 Content + Part 구조로 직렬화. GMS 게이트웨이가 SDK 의 자동 변환
    # ([Part, str] → Content) 결과를 제대로 못 forward 하는 경우 대비.
    content_payload = genai_types.Content(
        role="user",
        parts=[
            genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            genai_types.Part.from_text(text=prompt),
        ],
    )

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_VISION_MODEL,
            contents=[content_payload],
            config=genai_types.GenerateContentConfig(
                temperature=0.2,   # 일관된 JSON 분석을 위해 낮게
            ),
        )
    except Exception as e:
        # GMS 게이트웨이/Gemini API 에러 디버깅 정보 출력
        print(f"\n[ERROR] Gemini API 호출 실패")
        print(f"        model: {GEMINI_VISION_MODEL}")
        print(f"        image_size: {len(image_bytes):,} bytes")
        print(f"        mime_type:  {mime_type}")
        print(f"        error type: {type(e).__name__}")
        print(f"        error:      {e}")
        raise

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError(
            f"Gemini 2.5 Pro 응답이 비어있음. response={response!r}"
        )

    print(f"      → 원시 응답 (앞 300자): {text[:300]}...")

    # 응답에서 JSON 부분만 추출 (모델이 ```json ... ``` 같은 펜스 붙일 수 있음)
    parsed = extract_json(text)

    # full_response: SDK 가 돌려주는 객체는 JSON 직렬화가 까다로워 디버그용 dict 로 정리
    full_response = {
        "model": GEMINI_VISION_MODEL,
        "image_path": image_path,
        "image_mime_type": mime_type,
        "image_size_bytes": len(image_bytes),
        "raw_text": text,
        "usage_metadata": (
            response.usage_metadata.model_dump()
            if getattr(response, "usage_metadata", None) is not None
            and hasattr(response.usage_metadata, "model_dump")
            else None
        ),
    }
    return parsed, text, full_response


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
