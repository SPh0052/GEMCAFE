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
import json
import mimetypes
import os
import re
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

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

Now analyze the provided image. Output ONLY valid JSON in the same schema, no other text."""


# =====================================================================
# 핵심 함수
# =====================================================================
def _guess_mime_type(image_path: str) -> str:
    """파일 확장자에서 MIME 타입 추론. 알 수 없으면 image/jpeg 폴백."""
    mime, _ = mimetypes.guess_type(image_path)
    if mime and mime.startswith("image/"):
        return mime
    return "image/jpeg"


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
    image_bytes = Path(image_path).read_bytes()
    mime_type = _guess_mime_type(image_path)

    client = _get_client()
    response = client.models.generate_content(
        model=GEMINI_VISION_MODEL,
        contents=[
            genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ],
        config=genai_types.GenerateContentConfig(
            temperature=0.2,   # 일관된 JSON 분석을 위해 낮게
        ),
    )

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
