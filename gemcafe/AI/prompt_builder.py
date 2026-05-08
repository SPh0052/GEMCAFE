"""
시뮬레이션 종류 + focus 요소 → I2I/I2V 프롬프트 자동 생성.

분석 결과(analysis.json)와 사용자 선택(simulation, focus, background, hint)을
조합해서 nano-banana-pro/edit 와 Veo 3.1 에 넘길 프롬프트를 만든다.

지원 시뮬레이션:
  - cross_section_cut  (단면 자르기)
  - lift_slice         (한 조각 들어올리기)
  - topping_fall       (토핑 위에서 떨어지기)
"""
from typing import Optional


# =====================================================================
# Focus 키 → 자연어 영어 표현 매핑
# (Moondream의 suggested_focus가 snake_case로 와도 문장에 자연스럽게 박히도록)
#
# ⚠️ 색깔/구체적 외형 가정 금지: "white"/"red" 같은 단어 박지 말 것.
#    실제 색/외형은 원본 사진(I2I/I2V가 직접 봄) + Moondream 분석이 제공.
#    여기는 "어떤 종류의 요소인지"만 표현 (재료 자체의 정체성).
# =====================================================================
FOCUS_TEXT = {
    # 과일 / 토핑 류 (특정 과일은 색이 비교적 일정하지만 그래도 형용사 자제)
    "strawberry": "the strawberry on top",
    "strawberries": "the strawberries",
    "fresh_strawberries": "the strawberries on top",
    "blueberry": "the blueberries",
    "blueberries": "the blueberries",
    # 크림 류 (색 형용사 제거 — 흰크림/녹차크림/초콜릿크림 등 다 커버)
    "cream": "the cream",
    "whipped_cream": "the whipped cream",
    "fluffy_whipped_cream": "the fluffy whipped cream",
    "mascarpone_cream": "the mascarpone cream",
    # 시트 / 스펀지 류
    "sponge": "sponge cake layers",
    "sponge_layers": "sponge cake layers",
    "soft_sponge_layers": "soft sponge cake layers",
    # 기타
    "cocoa_dusting": "cocoa powder dusting",
    "molten_center": "molten chocolate center",
}


def focus_phrase(focus_key: str) -> str:
    """focus 키를 자연어로 변환. 매핑 없으면 underscore만 공백으로 바꿔서 사용."""
    if focus_key in FOCUS_TEXT:
        return FOCUS_TEXT[focus_key]
    return focus_key.replace("_", " ")


# =====================================================================
# 시뮬레이션 정의
# =====================================================================
# 각 시뮬레이션은:
#   - instruction_template: nano-banana-pro/edit 용 (I2I 키프레임 생성 지시)
#   - video_template:       Veo 3.1 용 (start→end 사이의 동작 묘사)
#   - frame_strategy:       "i2i_is_end" → start=원본, end=I2I결과
#                           "i2i_is_start" → start=I2I결과, end=원본
# 템플릿의 {focus} 자리는 자연어 focus 표현으로 치환됨.
# =====================================================================

SIMULATIONS = {
    # ─────────────────────────────────────────────────────────────────
    "cross_section_cut": {
        "label_kr": "단면 자르기",
        "frame_strategy": "i2i_is_end",
        "instruction_template": (
            "DO NOT regenerate or replace the cake. Use the exact input image as the base. "
            "Preserve the cake pixel-by-pixel: same shape, same toppings, same cream pattern, "
            "same plate, same background, same lighting. "
            "ADD ONLY this: a sharp metal knife pressed completely vertically through the cake "
            "from above, fully embedded straight down through the {focus} and all the cream/sponge "
            "layers, with a clean cut line visible where the blade has passed. "
            "The blade should be partially visible above the cake and partially inside it. "
            "Do not regenerate any existing element. Photorealistic, sharp focus, natural lighting."
        ),
        "video_template": (
            "A sharp metal knife descends slowly from above and cuts straight down through the cake, "
            "slicing cleanly through the {focus}, cream, and sponge layers. The cake stays in place. "
            "Smooth steady downward motion of the knife. Realistic physics, no morphing of the cake."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "lift_slice": {
        "label_kr": "한 조각 들어올리기",
        "frame_strategy": "i2i_is_end",
        "instruction_template": (
            "DO NOT regenerate or replace the cake. Use the exact input image as the base. "
            "Preserve the original cake pixel-by-pixel: same shape, same {focus}, same cream pattern, "
            "same plate, same background, same lighting. "
            "ADD ONLY this change: one slice of the cake is lifted slightly upward by a metal fork "
            "inserted into it from above. The lifted slice is partially separated from the rest, "
            "revealing the cross-section with visible cream and sponge layers. "
            "A thin strand of cream stretches between the lifted slice and the remaining cake. "
            "Highlight the texture of the {focus}. "
            "Do not alter the rest of the image. Photorealistic, sharp focus, natural lighting."
        ),
        "video_template": (
            "A metal fork lifts one slice of the cake upward steadily. Cream stretches and slightly "
            "drips between the lifted slice and the remaining cake. The {focus} stays attached to the "
            "lifted slice. Smooth gentle upward motion, realistic physics, no morphing."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "topping_fall": {
        "label_kr": "토핑 위에서 떨어지기",
        "frame_strategy": "i2i_is_start",   # 역방향: I2I = 토핑 없는 시작 상태
        "instruction_template": (
            "DO NOT regenerate or replace the cake. Use the exact input image as the base. "
            "Preserve the cake pixel-by-pixel: same shape, same cream, same plate, same background, "
            "same lighting. "
            "ONLY remove the {focus} from the top of the cake. The cake should look complete but "
            "without the {focus} — as if the {focus} hasn't been placed on it yet. Keep the cream "
            "surface where the {focus} was, smooth and natural, as if untouched. "
            "Do not change anything else. Photorealistic, sharp focus, natural lighting."
        ),
        "video_template": (
            "A {focus} falls gently from above and lands softly on top of the cake, settling into "
            "its natural position on the cream. Realistic physics with slight bounce on impact. "
            "The cake itself stays still. No morphing, no extra elements appear."
        ),
    },
}


# =====================================================================
# 시스템 프롬프트 (모든 시뮬레이션 공통 — 보존 페르소나)
# =====================================================================
SYSTEM_PROMPT = (
    "You are a precise photo editor. Your only job is to preserve the input image "
    "pixel-by-pixel and apply ONLY the specific edit requested. "
    "Never regenerate, replace, or reinterpret existing elements. "
    "Treat the input image as immutable except for the explicit changes requested."
)


# =====================================================================
# 배경 키 → 자연어 영어 표현
# =====================================================================
BACKGROUND_TEXT = {
    "white_marble": (
        "a clean white marble surface with soft natural diffused lighting and "
        "subtle elegant shadow under the cake"
    ),
    "cafe_interior": (
        "a cozy cafe interior with warm ambient lighting, wooden table surface, "
        "and slightly blurred background showing soft bokeh of cafe ambience"
    ),
    "outdoor": (
        "an outdoor garden setting with soft natural daylight, a light wooden "
        "or stone surface, and blurred greenery in the background"
    ),
}


# 배경 교체용 I2I 지시문 — 케이크는 보존하고 배경/면만 교체
BACKGROUND_INSTRUCTION_TEMPLATE = (
    "DO NOT change the cake itself. Use the exact input image as the base. "
    "ONLY replace the background and the surface the cake sits on with: {bg_text}. "
    "Preserve the cake pixel-by-pixel: the exact same cake shape, the exact toppings, "
    "the exact cream pattern, the exact plate/liner, and the exact lighting on the cake. "
    "Match the lighting direction of the new background so the cake looks naturally placed. "
    "Do not redraw, recolor, or reinterpret any part of the cake itself. "
    "Photorealistic, sharp focus."
)


def build_background_prompt(background_key: str) -> str:
    """배경 교체용 I2I 지시문 생성."""
    if background_key not in BACKGROUND_TEXT:
        raise ValueError(
            f"알 수 없는 background: {background_key}. "
            f"가능한 값: {list(BACKGROUND_TEXT.keys())}"
        )
    return BACKGROUND_INSTRUCTION_TEMPLATE.format(bg_text=BACKGROUND_TEXT[background_key])


# =====================================================================
# 핵심 빌더 함수
# =====================================================================
def build_prompts(
    simulation: str,
    focus: str,
    background: Optional[str] = None,
    hint: Optional[str] = None,
) -> dict:
    """
    Args:
        simulation: SIMULATIONS의 키 ("cross_section_cut", "lift_slice", "topping_fall")
        focus:      강조할 요소 키 (예: "strawberry", "whipped_cream", "sponge_layers")
        background: 배경 키워드 (예: "wooden table", "white marble") — 선택
        hint:       사용자 자유 추가 힌트 — 선택

    Returns:
        {
            "instruction_prompt": str,    # nano-banana-pro/edit용
            "video_prompt": str,          # Veo 3.1용
            "frame_strategy": str,        # "i2i_is_end" or "i2i_is_start"
            "system_prompt": str,         # nano-banana-pro/edit의 system_prompt용
            "label_kr": str,              # UI 표시용 한국어 라벨
        }
    """
    if simulation not in SIMULATIONS:
        raise ValueError(
            f"알 수 없는 simulation: {simulation}. "
            f"가능한 값: {list(SIMULATIONS.keys())}"
        )

    sim = SIMULATIONS[simulation]
    focus_text = focus_phrase(focus)

    instruction = sim["instruction_template"].format(focus=focus_text)
    video = sim["video_template"].format(focus=focus_text)

    # 배경/힌트가 있으면 프롬프트 끝에 덧붙임
    extras = []
    if background:
        extras.append(f"Background: {background}.")
    if hint:
        extras.append(hint.strip())
    if extras:
        suffix = " " + " ".join(extras)
        instruction += suffix
        video += suffix

    return {
        "instruction_prompt": instruction,
        "video_prompt": video,
        "frame_strategy": sim["frame_strategy"],
        "system_prompt": SYSTEM_PROMPT,
        "label_kr": sim["label_kr"],
    }


# =====================================================================
# 오토 프롬프팅 (LLM 기반) — Phase 1: 슬롯 → 한국어 미리보기
# =====================================================================
def build_korean_preview(
    simulation: str,
    focus: str,
    background: Optional[str] = None,
    hint: Optional[str] = None,
    dessert_info: str = "케이크",
    cake_elements: Optional[list] = None,
    analysis: Optional[dict] = None,
) -> str:
    """
    사장님 선택값을 LLM(Gemini 3.1 Flash-Lite)에 넘겨 자연스러운 한국어 미리보기 생성.

    cake_elements: 분석 결과에서 추출된 요소 키 리스트
                  (예: ["whipped_cream", "sponge", "strawberry"])
                  → prompt_locks.TEXTURE_PROFILES와 매칭되어 LLM에 질감 가이드로 공급.
    analysis:     Moondream 분석 결과 dict가 있으면 cake_elements를 자동 추출.
                  cake_elements가 직접 주어지면 그게 우선.

    /preview-prompts 엔드포인트가 이 결과를 사장님에게 보여주고 편집 가능하게 함.
    """
    # llm_client는 여기서 import (Gemini 키 없어도 다른 함수는 동작하도록)
    from llm_client import generate_korean_preview
    import prompt_locks

    sim_label_kr = prompt_locks.get_simulation_label_kr(simulation)
    bg_label_kr = prompt_locks.get_background_label_kr(background)
    focus_kr = focus_phrase(focus)  # 영어지만 LLM이 알아서 처리

    # cake_elements 결정 — 직접 받은 게 우선, 없으면 analysis에서 추출
    if cake_elements is None and analysis is not None:
        cake_elements = prompt_locks.collect_elements_from_analysis(analysis)

    texture_guidance = (
        prompt_locks.get_texture_guidance(cake_elements, simulation)
        if cake_elements
        else ""
    )

    return generate_korean_preview(
        dessert_info=dessert_info,
        focus_label_kr=focus_kr,
        simulation_label_kr=sim_label_kr,
        background_label_kr=bg_label_kr,
        user_hint=hint,
        texture_guidance=texture_guidance,
    )


# =====================================================================
# 오토 프롬프팅 — Phase 2 + 잠금 라이브러리 결합 (최종 영어 영상 프롬프트)
# =====================================================================
def assemble_final_video_prompt(
    user_korean_text: str,
    simulation: str,
    background: Optional[str] = None,
    model_id: str = "veo-3.1",
) -> dict:
    """
    사장님이 (편집한) 한국어 영상 묘사 → 영상 모델용 최종 영어 프롬프트로 변환.

    1. LLM(Gemini 3.1 Flash-Lite)이 한국어 → 영어 영상 프롬프트로 의역
    2. 시스템이 잠금 라이브러리(카메라/기술/모델별/배경/길이/부정)를 결합
    3. fal.ai에 그대로 넘길 수 있는 dict 반환

    Returns:
        {
          "prompt":            str,   # 최종 영어 영상 프롬프트
          "negative_prompt":   str,   # 부정 프롬프트 (공통 + 시뮬레이션별)
          "duration":          str,   # "4s" / "6s" / "8s"
          "user_part_en":      str,   # 디버깅용: LLM이 변환한 사장님 부분만
        }
    """
    from llm_client import translate_to_video_prompt
    import prompt_locks

    # 1) 사장님 한국어 → 영어 (LLM)
    user_part_en = translate_to_video_prompt(user_korean_text)

    # 2) 잠금 영역 조합
    camera = prompt_locks.get_camera(simulation)
    technical = prompt_locks.TECHNICAL_BASELINE
    model_extras = prompt_locks.get_model_extras(model_id)
    duration = prompt_locks.get_duration(simulation)
    negative = prompt_locks.get_negative_prompt(simulation)

    parts = [user_part_en]
    if background:
        bg_text = prompt_locks.get_mood_lighting(background)
        if bg_text:
            parts.append(f"Setting: {bg_text}")
    parts.append(f"Camera: {camera}")
    parts.append(technical)
    parts.append(model_extras)

    # 마침표로 안전하게 결합
    final_prompt = ". ".join(p.rstrip(". ") for p in parts if p) + "."

    return {
        "prompt": final_prompt,
        "negative_prompt": negative,
        "duration": duration,
        "user_part_en": user_part_en,
    }


# =====================================================================
# 단독 실행 시 — 9가지 조합(3 시뮬레이션 × 3 focus) 미리보기
# =====================================================================
if __name__ == "__main__":
    test_focuses = ["strawberry", "whipped_cream", "sponge_layers"]
    for sim_id in SIMULATIONS:
        for focus in test_focuses:
            print("=" * 70)
            print(f"[{sim_id}] × [{focus}]  →  {SIMULATIONS[sim_id]['label_kr']}")
            print("=" * 70)
            p = build_prompts(sim_id, focus)
            print(f"\n[I2I 지시문]")
            print(p["instruction_prompt"])
            print(f"\n[I2V 영상 프롬프트]")
            print(p["video_prompt"])
            print(f"\n[frame_strategy] {p['frame_strategy']}")
            print()
