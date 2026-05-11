"""
Gemini 3.1 Flash-Lite 래퍼 — 오토 프롬프팅용 LLM 호출.

3가지 단계:
  1) generate_korean_preview()      슬롯 → 자연스러운 한국어 묘사 (사장님 노출용)
  2) translate_to_video_prompt()    사장님 한국어 → 영상 모델용 영어
  3) expand_hint() (선택)           짧은 한국어 힌트 → 4가지 측면으로 확장

환경변수:
  GEMINI_API_KEY   .env 파일에 추가 필요

비용:
  Gemini 3.1 Flash-Lite 기준 1회 호출 매우 저렴 (Flash 대비 ~3분의 1)
"""

import json
import os
import re
from typing import Optional

from google import genai
from google.genai import types as genai_types


# =====================================================================
# 클라이언트 초기화
# =====================================================================
_client: Optional[genai.Client] = None
# 모델 ID — Gemini 3.1 Flash-Lite. 다른 모델로 바꾸려면 여기만 수정.
# 후보: "gemini-3.1-flash-lite" / "gemini-2.5-flash-lite" / "gemini-2.5-flash"
_MODEL = "gemini-3.1-flash-lite"


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY 환경변수 미설정. .env 파일에 추가하세요."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _call_gemini(
    system_instruction: str,
    user_prompt: str,
    temperature: float = 0.7,
) -> str:
    """Gemini 호출 공통 함수. 텍스트 응답만 반환."""
    client = _get_client()
    response = client.models.generate_content(
        model=_MODEL,
        contents=user_prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
        ),
    )
    return (response.text or "").strip()


# =====================================================================
# Phase 1: 슬롯 → 자연스러운 한국어 (사장님 노출용)
# =====================================================================
SYSTEM_PROMPT_PREVIEW = """당신은 카페 디저트 광고 영상의 한국어 미리보기 설명을 작성하는 카피라이터입니다.

# 작업
사장님이 선택한 정보를 받아서, 만들어질 영상이 어떤 모습일지 한국어로 자연스럽게 묘사합니다. 사장님이 영상의 분위기를 머릿속에 그려볼 수 있도록 하는 것이 목표입니다.

# 출력 규칙
1. 분량: 2~3문장. 150~200자 사이.
2. 시제: 현재형 또는 진행형 ("~합니다", "~됩니다" 등 자연스럽게)
3. 톤: 카페 광고 카피 느낌. 부드럽고 시각적.
4. 포함할 내용:
   - 디저트가 어떻게 보이는지
   - 어떤 모션이 일어나는지 (도구의 접촉 방향까지 명시: "위에서 수직으로", "옆으로 평행하게" 등)
   - 각 요소의 **반응** (눌리는 쪽이 어떻게 변하는지 — 압축/밀림/갈라짐/즙 터짐 등)
   - 배경/조명의 분위기
5. 물리적으로 정확하게 묘사할 것:
   - "디저트 요소별 예상 질감" 슬롯이 주어지면 그 묘사를 따를 것 (창작 X)
   - 잘못된 예: "생크림이 부풀어 오른다" (눌릴 때 부풀지 않음)
   - 옳은 예: "생크림이 결 따라 매끄럽게 갈라진다", "생크림이 옆으로 밀려 퍼진다"
6. 절대 포함하지 말 것:
   - 기술 용어 (4K, 슬로우 모션, fps, 카메라 워크 명칭)
   - 영어 단어 (한국 음식 이름은 한글로)
   - 광고/마케팅 상투어 ("최고의", "특별한", "환상적인")
   - "영상", "비디오", "촬영" 같은 메타 단어
7. 사장님 추가 요청이 있으면 자연스럽게 녹여서 반영. 무시하지 말 것.

# 예시 1 — 자르기/단면 노출형
입력:
- 디저트: 딸기 쇼트케이크
- 강조 요소: 부드러운 생크림
- 시뮬레이션: 단면 자르기 (칼이 위에서 단면을 가르며 들어감)
- 배경: 흰 대리석
- 사장님 추가: "고급스럽게"
- 디저트 요소별 예상 질감:
  - 생크림: 부드럽게 갈라짐, 결 따라 매끄럽게 분리
  - 스펀지 시트: 부스러기 발생, 결과 층 노출
  - 딸기: 단면에 즙 맺힘, 빨간 단면 노출

좋은 출력: "흰 대리석 위에 단정하게 놓인 딸기 쇼트케이크. 은빛 칼날이 위에서 수직으로 천천히 내려와 단면을 가르자, 부드러운 생크림이 결 따라 매끄럽게 분리되고 시트의 결과 딸기 단면이 드러납니다. 차분하고 고급스러운 분위기."

# 예시 2 — 들어올리기형 (단면 노출 동반)
입력:
- 디저트: 초콜릿 라바 케이크
- 강조 요소: 흐르는 초콜릿
- 시뮬레이션: 한 조각 들어올리기 (포크로 한 조각을 위로 들어올림)
- 배경: 어두운 무드
- 사장님 추가: 없음
- 디저트 요소별 예상 질감:
  - 가나슈: 매끈한 단면, 윤기
  - 초콜릿 스펀지: 진한 갈색 결과 층 드러남
  - 흐르는 초콜릿: 단면에서 진하게 흘러내림

좋은 출력: "어두운 슬레이트 위 따뜻한 초콜릿 라바 케이크. 포크가 한 조각을 천천히 위로 들어올리자 매끈한 가나슈 단면이 드러나고, 진한 초콜릿이 단면에서 무겁게 흘러내립니다. 한 줄기 측면 조명이 주는 무게감 있는 분위기."

# 출력 형식
한국어 묘사만 출력. 다른 텍스트, 따옴표, 설명 없이."""


def generate_korean_preview(
    dessert_info: str,
    focus_label_kr: str,
    simulation_label_kr: str,
    background_label_kr: str,
    user_hint: Optional[str] = None,
    texture_guidance: Optional[str] = None,
    temperature: float = 0.6,
) -> str:
    """
    슬롯 정보 → 자연스러운 한국어 영상 미리보기 묘사.
    사장님 화면에 띄워서 편집 가능하게 하는 용도.

    texture_guidance: prompt_locks.get_texture_guidance()로 만든 한국어 텍스트
                       (요소별 예상 질감/반응). 비물리적 묘사를 LLM이 만들지 않도록 잠금.
    """
    hint_line = user_hint.strip() if user_hint and user_hint.strip() else "없음"
    texture_block = (
        f"- 디저트 요소별 예상 질감:\n{texture_guidance}\n"
        if texture_guidance and texture_guidance.strip()
        else ""
    )
    user_prompt = (
        f"# 입력 정보\n"
        f"- 디저트 정보: {dessert_info}\n"
        f"- 강조 요소: {focus_label_kr}\n"
        f"- 시뮬레이션(영상 모션): {simulation_label_kr}\n"
        f"- 배경: {background_label_kr}\n"
        f"- 사장님 추가 요청: {hint_line}\n"
        f"{texture_block}"
    )
    return _call_gemini(SYSTEM_PROMPT_PREVIEW, user_prompt, temperature=temperature)


# =====================================================================
# Phase 2: 사장님 한국어 수정본 → 영상 모델용 영어
# =====================================================================
SYSTEM_PROMPT_TRANSLATE = """You are a translator that converts Korean video descriptions into English prompts for AI video generation models (Kling, Veo, Seedance).

# Task
Convert the user's Korean description into an English video generation prompt. The English output will be used directly with image-to-video AI models.

# Output Rules
1. Length: 2-4 sentences. Match the input's level of detail.
2. Style: Use cinematic / food photography vocabulary that AI video models understand well:
   - "macro shot", "close-up", "slow motion", "tracking shot"
   - "soft golden lighting", "natural lighting", "studio lighting"
   - "shallow depth of field", "rack focus"
   - "ASMR", "cinematic", "photorealistic"
3. Tense: Present continuous for actions ("a fork is slowly pressing"), present simple for static descriptions ("the cake sits on...").
4. Korean food terms: Transliterate, don't translate.
   - 인절미 → injeolmi (not "rice cake")
   - 흑임자 → black sesame
   - 약과 → yakgwa
   - 떡 → tteok / rice cake (depending on context)
   - 팥 → red bean / pat
   - 설향 딸기 → Seolhyang strawberry
5. Common Korean dessert vocabulary:
   - 생크림 → whipped cream
   - 휘핑크림 → whipped cream
   - 마스카포네 → mascarpone
   - 가나슈 → ganache
   - 단면 → cross-section
   - 시트 → sponge
   - 결 → texture / grain
   - 폭신한 → fluffy
   - 촉촉한 → moist
   - 진한 → rich
   - 부드러운 → soft / smooth
   - 단단한 → firm
   - 살짝 / 천천히 → gently / slowly
6. Avoid literal translation when it sounds unnatural:
   - "고급스럽게" → "elegant, sophisticated atmosphere" (not "luxuriously")
   - "따뜻한 분위기" → "warm cozy atmosphere" (not "warm mood")
   - "은은한" → "subtle, soft" (not "faint")
   - "차분한" → "calm, understated" (not "calm")
7. DO NOT add:
   - Camera control instructions ("camera holds for 0.5s") — system adds these
   - Technical specs ("4K", "120fps") — system adds these
   - Negative prompts ("no hands") — system adds these
   - Background details if not mentioned — system adds these
   - Brand names or copyrighted terms
8. DO preserve:
   - Specific ingredients mentioned by the user
   - Action sequence ordering
   - Mood / atmosphere words
   - Any unique creative direction from the user

# Output Format
Output ONLY the English prompt. No quotes, no markdown, no explanation, no "Translation:" prefix."""


def translate_to_video_prompt(
    korean_text: str,
    temperature: float = 0.3,
) -> str:
    """사장님이 작성/수정한 한국어 → 영상 모델용 영어 프롬프트."""
    return _call_gemini(SYSTEM_PROMPT_TRANSLATE, korean_text, temperature=temperature)


# =====================================================================
# Phase 2-3 (선택): 짧은 힌트 → 4가지 측면 확장
# =====================================================================
SYSTEM_PROMPT_HINT_EXPAND = """당신은 사장님의 짧은 한국어 분위기 힌트를 영상 묘사에 쓸 수 있는 구체적인 한국어 키워드들로 확장합니다.

# 작업
힌트를 다음 4개 측면으로 풀어서 출력:
- 조명: 어떤 조명/색감
- 모션: 어떤 속도/리듬
- 분위기: 전반적 무드
- 시각적_디테일: 추가 시각 요소

# 출력 형식 (JSON, 다른 텍스트 없이)
{
  "조명": "...",
  "모션": "...",
  "분위기": "...",
  "시각적_디테일": "..."
}

# 예시
입력: "고급스럽게"
출력:
{
  "조명": "차분한 황금빛, 은은한 측면광",
  "모션": "느리고 절제된 움직임",
  "분위기": "정제된, 우아한, 단정한",
  "시각적_디테일": "매끈한 표면, 깔끔한 여백"
}

# 규칙
- 한국어로만 출력
- 각 항목 10~25자 이내
- JSON만 출력, 다른 텍스트 없이"""


def expand_hint(hint: str, temperature: float = 0.4) -> dict:
    """짧은 힌트를 4가지 측면으로 확장. JSON 파싱 실패 시 빈 dict 반환."""
    if not hint or not hint.strip():
        return {}
    try:
        text = _call_gemini(SYSTEM_PROMPT_HINT_EXPAND, hint.strip(), temperature=temperature)
        # JSON만 추출 (코드펜스 제거)
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except (json.JSONDecodeError, RuntimeError):
        pass
    return {}


# =====================================================================
# 단독 실행 — Gemini만 빠르게 테스트
#   python llm_client.py
# =====================================================================
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    print(f"[모델] {_MODEL}")
    print(f"[GEMINI_API_KEY] {'설정됨' if os.environ.get('GEMINI_API_KEY') else '❌ 미설정'}\n")

    # ───────────────────────────────────────
    # Phase 1 — 한국어 미리보기 생성 (질감 가이드 포함)
    # ───────────────────────────────────────
    print("=" * 60)
    print("Phase 1: 슬롯 → 한국어 미리보기 (질감 가이드 적용)")
    print("=" * 60)
    # prompt_locks를 활용해서 요소 → 질감 가이드 합성
    import prompt_locks
    elements = ["whipped_cream", "sponge", "strawberry"]
    texture_guidance = prompt_locks.get_texture_guidance(elements, "cross_section_cut")
    print(f"[texture_guidance]\n{texture_guidance}\n")

    korean = generate_korean_preview(
        dessert_info="딸기 쇼트케이크",
        focus_label_kr="신선한 딸기",
        simulation_label_kr="단면 자르기 (칼이 위에서 단면을 가르며 들어감)",
        background_label_kr="흰 대리석",
        user_hint="고급스럽게",
        texture_guidance=texture_guidance,
    )
    print(f"[Phase 1 결과]\n{korean}\n")

    # ───────────────────────────────────────
    # Phase 2 — 한국어 → 영어 영상 프롬프트
    # ───────────────────────────────────────
    print("=" * 60)
    print("Phase 2: 한국어 → 영어 영상 프롬프트")
    print("=" * 60)
    english = translate_to_video_prompt(korean)
    print(english)
    print()

    # ───────────────────────────────────────
    # 보너스: 힌트 확장
    # ───────────────────────────────────────
    print("=" * 60)
    print("Phase 2-3: 힌트 확장 (보너스)")
    print("=" * 60)
    expanded = expand_hint("고급스럽게")
    print(json.dumps(expanded, indent=2, ensure_ascii=False))
