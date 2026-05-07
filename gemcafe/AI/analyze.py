"""
STEP 2 — 케이크 이미지 자동 분석 (Moondream3 Preview).

이미지 한 장 입력 → 케이크 구성요소(cream, topping, coating 등) JSON 추출.
이 결과는 STEP 3(focus 선택)에서 UI에 띄울 옵션을 만드는 데 사용됨.

실행:
    1) FAL_KEY 환경변수 설정 (.env에 FAL_KEY=...)
    2) 아래 INPUT_IMAGE_PATH를 본인 케이스에 맞게 수정
    3) python analyze.py

⚠️ fal.ai의 fal-ai/moondream3-preview/query 입력 필드명은 추정치입니다.
   실패 시 Schema 페이지에서 정확한 필드명 확인 후 수정.
"""
import json
import os
import re
from datetime import datetime
from pathlib import Path
import fal_client
from dotenv import load_dotenv

load_dotenv()

# =====================================================================
# 설정
# =====================================================================
ENDPOINT_MOONDREAM = "fal-ai/moondream3-preview/query"

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
# 진행 로그 콜백
# =====================================================================
def on_queue_update(update):
    if isinstance(update, fal_client.InProgress):
        for log in (update.logs or []):
            msg = log.get("message", "")
            if msg:
                print(f"      [fal] {msg}")


# =====================================================================
# 핵심 함수
# =====================================================================
def upload(path: str) -> str:
    print(f"[1/2] 이미지 업로드: {path}")
    url = fal_client.upload_file(path)
    print(f"      → {url}")
    return url


def analyze_with_moondream(image_url: str, prompt: str) -> dict:
    """
    Moondream3 Preview로 이미지 분석. JSON 응답 → dict 변환 후 반환.
    """
    print(f"[2/2] Moondream3 분석 중...")
    result = fal_client.subscribe(
        ENDPOINT_MOONDREAM,
        arguments={
            "image_url": image_url,
            "prompt": prompt,            # 만약 422 나면 "question" 으로 변경
            "reasoning": True,           # CoT 추론 모드 (지원하면)
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    # 디버그: 응답 구조 출력 (첫 호출에서 키 확인용)
    print(f"      [debug] 응답 키: {list(result.keys())}")

    # 모델의 텍스트 응답 추출 (여러 키 형식 대응)
    text = None
    for key in ("output", "answer", "response", "text", "result"):
        v = result.get(key)
        if isinstance(v, str) and v.strip():
            text = v
            break

    if text is None:
        raise RuntimeError(
            f"Moondream3 텍스트 응답을 찾지 못함. 응답 전체:\n"
            f"{json.dumps(result, indent=2, ensure_ascii=False, default=str)[:1500]}"
        )

    print(f"      → 원시 응답 (앞 300자): {text[:300]}...")

    # 응답에서 JSON 부분만 추출 (모델이 ```json ... ``` 같은 펜스 붙일 수 있음)
    parsed = extract_json(text)
    return parsed


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
    if not os.environ.get("FAL_KEY"):
        raise SystemExit("FAL_KEY 미설정. .env 에 추가하세요.")
    if not os.path.exists(INPUT_IMAGE_PATH):
        raise SystemExit(f"입력 이미지가 없습니다: {INPUT_IMAGE_PATH}")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(OUTPUT_DIR) / f"analyze_{ts}"
    run_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n결과 저장 폴더: {run_dir}\n")

    image_url = upload(INPUT_IMAGE_PATH)
    analysis = analyze_with_moondream(image_url, ANALYSIS_PROMPT)

    # 파일로 저장
    output_path = run_dir / "analysis.json"
    output_path.write_text(
        json.dumps(analysis, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # 콘솔 출력 (보기 좋게)
    print("\n" + "=" * 60)
    print("Moondream3 분석 결과")
    print("=" * 60)
    print(json.dumps(analysis, indent=2, ensure_ascii=False))
    print("=" * 60)
    print(f"저장: {output_path}")

    # STEP 3 미리보기 — suggested_focus 옵션
    if "suggested_focus" in analysis:
        print(f"\n[STEP 3 후보 (suggested_focus)]")
        for i, focus in enumerate(analysis["suggested_focus"], 1):
            print(f"  {i}. {focus}")


if __name__ == "__main__":
    main()
