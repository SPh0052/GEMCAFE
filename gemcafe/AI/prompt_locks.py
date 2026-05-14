"""
잠금 라이브러리 — 사장님에게 노출하지 않고 시스템이 자동 결합하는 프롬프트 자산.

카테고리:
  - SIMULATION_LABELS_KR     시뮬레이션 한국어 라벨 (LLM에 슬롯으로 전달)
  - BACKGROUND_LABELS_KR     배경 한국어 라벨
  - CAMERA_DIRECTIVES        시뮬레이션별 카메라 워크 (영어, Veo에 직접 들어감)
  - TECHNICAL_BASELINE       모든 영상 공통 기술 키워드
  - MODEL_SPECIFIC_ADDITIONS 영상 모델별 추가 키워드
  - NEGATIVE_PROMPTS         시뮬레이션별 + 공통 부정 프롬프트
  - MOOD_LIGHTING            배경별 영어 묘사
  - DURATION_SETTINGS        시뮬레이션별 권장 영상 길이(초)
  - TEXTURE_PROFILES         요소별 반응 / 시각 정체성 매핑
  - MOISTURE_DESCRIPTIONS    시트 촉촉도 단계별 한/영 묘사

확장 방법:
  - 새 시뮬레이션 추가 시 모든 dict에 같은 ID로 한 줄씩 추가.
  - 새 배경 추가 시 BACKGROUND_LABELS_KR + MOOD_LIGHTING 둘 다 추가.
"""
from typing import Optional

# =====================================================================
# 시뮬레이션 / 배경 한국어 라벨 (사장님 화면 + LLM 슬롯)
# =====================================================================
SIMULATION_LABELS_KR = {
    "smash":              "뭉개기 (포크가 케이크 위를 눌러 살짝 짓누름)",
    "fork_bite":          "포크로 한 입 뜨기 (포크가 케이크 한 입 분량을 떠 들어올림)",
    "cut_in_half":        "반으로 자르기 (칼이 케이크 조각을 수직으로 갈라 단면 노출)",
    "cream_scoop":        "크림만 떠내기 (숟가락이 케이크 위 크림 한 덩이만 떠올림)",
    "strawberry_fall":    "딸기가 케이크 위로 톡 떨어진다 (한 알이 위에서 떨어져 안착)",
    "strawberry_cascade": "딸기가 우수수 쏟아진다 (여러 알이 차례로 케이크 위로 떨어져 안착)",
}

BACKGROUND_LABELS_KR = {
    "white_marble":     "흰 대리석",
    "cafe_interior":    "카페 인테리어",
    "outdoor":          "야외 정원",
    "wooden_table":     "원목 테이블",
    "minimalist_white": "미니멀 화이트",
    "dark_moody":       "어두운 무드",
}


# =====================================================================
# 카메라 제어 (시뮬레이션별)
# =====================================================================
CAMERA_DIRECTIVES = {
    "smash": (
        "Static camera at slightly above eye level looking down at the cake. "
        "Fork enters from top of frame. Subtle push-in as the indentation forms."
    ),
    "fork_bite": (
        "Steady camera at a slight high angle. Framing widens gently as the bite "
        "is lifted, keeping both the cake and the lifted fork comfortably in view."
    ),
    "cut_in_half": (
        "Camera starts wide on the full cake slice, then slowly and continuously "
        "pushes in to an extreme macro close-up on the split area where the fork "
        "meets the cake. Fork enters from behind the cake with the handle extending "
        "away from the camera into the background."
    ),
    "cream_scoop": (
        "Camera tracks upward following the lifted spoonful of cream. "
        "Macro close-up emphasizing cream texture and the stretched strand."
    ),
    "strawberry_fall": (
        "Static camera, top-down 45-degree angle. "
        "Captures full cake surface and the falling strawberry briefly."
    ),
    "strawberry_cascade": (
        "Static camera, top-down 45-degree angle, slightly wider framing. "
        "Captures the full cake surface as multiple strawberries fall and settle."
    ),
    "default": "Static camera, macro close-up, eye level.",
}


# =====================================================================
# 기술 키워드 (공통)
# =====================================================================
TECHNICAL_BASELINE = (
    "Slow motion playback, shallow depth of field, soft cinematic lighting, "
    "4K photorealistic, professional food photography aesthetic, ASMR style"
)


# =====================================================================
# 모델별 추가 키워드
# =====================================================================
MODEL_SPECIFIC_ADDITIONS = {
    "veo-3.1": (
        "ASMR sound design, natural ambient audio, cinematic depth"
    ),
    "kling-3.0-pro": (
        "preserve original texture and color, maintain object identity, "
        "smooth motion interpolation"
    ),
    "kling-2.6-pro": (
        "smooth motion, preserve original colors, no distortion"
    ),
    "hailuo-2.3": (
        "natural physics, realistic motion, smooth transitions"
    ),
    "default": "smooth motion, preserve original colors and texture",
}


# =====================================================================
# 부정 프롬프트 (시뮬레이션별 + 공통)
# =====================================================================
NEGATIVE_COMMON = (
    "no hands appearing, no people, no text, no logos, no watermarks, "
    "no morphing, no extra objects appearing, no warping, no flickering, "
    "no color shift, preserve original cake shape and identity"
)

NEGATIVE_PER_SIMULATION = {
    "smash": (
        "no hands holding fork, no cake breaking apart, no excessive deformation, "
        "fork presses gently, indentation stays controlled"
    ),
    "fork_bite": (
        "abrupt jump, sudden cut, flicker, camera shake, hands, person, "
        "plate movement, cake sliding, toppings falling, crumbs, debris"
    ),
    "cut_in_half": (
        "hands, fingers, human body parts, faces, people, text, watermark, logo, "
        "subtitles, captions, distorted fork, bent fork, deformed fork, multiple forks, "
        "fork changing shape, cake moving on its own, cake rotating, cake bouncing, "
        "shaky camera, handheld camera shake, jittery motion, abrupt camera cuts, "
        "sudden zoom jumps, flickering, color shifting, blurry artifacts, low quality, "
        "oversaturated colors, cartoon style, illustration, 3D render look, "
        "plastic-looking food, fake-looking cream"
    ),
    "cream_scoop": (
        "no hands holding spoon, no cream dripping violently, "
        "no toppings displaced, cream lifts smoothly"
    ),
    "strawberry_fall": (
        "no strawberry bouncing off violently, no excessive splashing, "
        "strawberry lands naturally and gently in its position"
    ),
    "strawberry_cascade": (
        "no strawberries bouncing off violently, no excessive splashing, "
        "no strawberries rolling off the cake, each lands naturally and gently"
    ),
}


# =====================================================================
# 분위기/조명 프리셋 (배경별)
# =====================================================================
MOOD_LIGHTING = {
    "white_marble": (
        "white marble counter, soft golden hour lighting from the left, "
        "clean minimalist setting"
    ),
    "wooden_table": (
        "warm wooden surface, soft warm afternoon lighting, cozy atmosphere"
    ),
    "cafe_interior": (
        "softly blurred cafe background with bokeh, warm ambient lighting, "
        "intimate setting"
    ),
    "minimalist_white": (
        "pure white seamless background, soft diffused lighting, "
        "studio product photography"
    ),
    "dark_moody": (
        "dark slate surface, dramatic single-source side lighting, "
        "high contrast moody atmosphere"
    ),
    "outdoor": (
        "natural wooden tray on garden table, dappled sunlight through leaves, "
        "organic outdoor setting"
    ),
}


# =====================================================================
# 영상 길이 (시뮬레이션별 권장 — 단, Veo 3.1은 4/6/8초만 가능)
# =====================================================================
DURATION_SETTINGS = {
    "smash":              "4s",
    "fork_bite":          "6s",
    "cut_in_half":        "6s",
    "cream_scoop":        "6s",
    "strawberry_fall":    "4s",
    "strawberry_cascade": "6s",
    "default":            "6s",
}


# =====================================================================
# 헬퍼 — 키 조회 시 default fallback
# =====================================================================
def get_camera(simulation_id: str) -> str:
    return CAMERA_DIRECTIVES.get(simulation_id, CAMERA_DIRECTIVES["default"])


def get_model_extras(model_id: str) -> str:
    return MODEL_SPECIFIC_ADDITIONS.get(model_id, MODEL_SPECIFIC_ADDITIONS["default"])


def get_mood_lighting(background_id: str) -> str:
    return MOOD_LIGHTING.get(background_id, "")


def get_negative_prompt(simulation_id: str) -> str:
    """공통 + 시뮬레이션별 부정 프롬프트 결합."""
    sim_specific = NEGATIVE_PER_SIMULATION.get(simulation_id, "")
    if sim_specific:
        return f"{NEGATIVE_COMMON}, {sim_specific}"
    return NEGATIVE_COMMON


def get_duration(simulation_id: str) -> str:
    return DURATION_SETTINGS.get(simulation_id, DURATION_SETTINGS["default"])


def get_simulation_label_kr(simulation_id: str) -> str:
    return SIMULATION_LABELS_KR.get(simulation_id, simulation_id)


def get_background_label_kr(background_id: str) -> str:
    if background_id is None:
        return "원본 배경 그대로"
    return BACKGROUND_LABELS_KR.get(background_id, background_id)


# =====================================================================
# 디저트 요소별 질감/반응 프로파일
# (LLM이 "생크림이 부풀어 오른다" 같은 비물리적 묘사를 만드는 걸 방지.
#  Moondream 분석 결과에서 추출된 요소들을 이 테이블로 매핑해 LLM에 공급.)
# =====================================================================
TEXTURE_PROFILES = {
    # 크림 / 필링 류
    "whipped_cream": {
        "label_kr": "생크림",
        # 생크림은 거품 낸 균질 구조라 '결' 개념이 없고, 탄성이 없어 치즈처럼 늘어나지
        # 않는다. 들거나 누를 때 뾰족한 뿔을 그리며 깔끔하게 끊어지는 것이 사실적.
        "under_pressure_kr": (
            "구름처럼 폭신한 질감이 도구에 가벼운 저항감을 보이며 부드럽게 압축되고 "
            "옆으로 살짝 밀려 퍼짐. 도구를 따라 올라오는 부분은 뾰족한 뿔을 그리듯 "
            "깔끔하게 끊어짐. 늘어지거나 길게 늘어붙지 않음."
        ),
        "when_cut_kr": (
            "구름처럼 폭신한 질감이 도구를 따라 부드럽게 밀려나며 매끄러운 표면이 "
            "가볍게 갈라짐. 단면이 매끈하고 끊김이 짧고 깨끗함. 결이 없는 균질한 "
            "거품 구조라 늘어지거나 실처럼 늘어붙지 않음."
        ),
        "visual_identity_en": "fluffy whipped cream (light, airy, soft white dairy cream)",
    },
    "cream": {
        "label_kr": "크림",
        "under_pressure_kr": "옆으로 밀려 퍼지고 도구에 묻어남",
        "when_cut_kr": "부드럽게 갈라짐",
        "visual_identity_en": "soft cream (light dairy texture)",
    },
    "mascarpone_cream": {
        "label_kr": "마스카포네 크림",
        "under_pressure_kr": "두툼하게 밀려 퍼짐",
        "when_cut_kr": "매끈한 단면, 살짝 윤기",
        "visual_identity_en": "mascarpone cream (rich Italian dairy with smooth surface and slight sheen)",
    },
    "ganache": {
        "label_kr": "가나슈",
        "under_pressure_kr": "천천히 함몰, 광택 유지",
        "when_cut_kr": "매끈한 단면, 윤기",
        "visual_identity_en": "chocolate ganache (smooth glossy thick chocolate cream)",
    },
    "molten_chocolate": {
        "label_kr": "흐르는 초콜릿",
        "under_pressure_kr": "내부에서 흘러나옴",
        "when_cut_kr": "단면에서 진하게 흘러내림",
        "visual_identity_en": "molten chocolate (warm dark flowing chocolate sauce)",
    },

    # 베이스 / 시트 류
    "sponge": {
        "label_kr": "스펀지 시트",
        "under_pressure_kr": "탄력 있게 짓눌렸다 일부 복원",
        "when_cut_kr": "부스러기 발생, 결과 층 노출",
        "visual_identity_en": "sponge cake (soft baked layers with airy crumb texture)",
    },
    "vanilla_sponge": {
        "label_kr": "바닐라 스펀지",
        "under_pressure_kr": "탄력 있게 짓눌렸다 일부 복원",
        "when_cut_kr": "노란빛 결과 층 드러남",
        "visual_identity_en": "vanilla sponge cake (pale yellow soft baked layers)",
    },
    "chocolate_sponge": {
        "label_kr": "초콜릿 스펀지",
        "under_pressure_kr": "탄력 있게 짓눌렸다 일부 복원",
        "when_cut_kr": "진한 갈색 결과 층 드러남",
        "visual_identity_en": "chocolate sponge cake (dark brown soft baked layers)",
    },
    "ladyfinger_biscuit": {
        "label_kr": "레이디핑거",
        "under_pressure_kr": "살짝 부서지고 시럽이 배어남",
        "when_cut_kr": "단면에 시럽 자국 노출",
        "visual_identity_en": "ladyfinger biscuit (coffee-soaked golden sponge fingers)",
    },
    "mousse": {
        "label_kr": "무스",
        "under_pressure_kr": "푹 꺼지고 공기층 붕괴",
        "when_cut_kr": "매끈하게 베이며 단면 부드러움",
        "visual_identity_en": "mousse (light airy whipped dessert with smooth surface)",
    },

    # 토핑 류
    "strawberry": {
        "label_kr": "딸기",
        "under_pressure_kr": "즙 살짝 터짐",
        "when_cut_kr": "단면에 즙 맺힘, 빨간 단면 노출",
        "visual_identity_en": "fresh strawberry fruit (red whole or sliced berry)",
    },
    "blueberry": {
        "label_kr": "블루베리",
        "under_pressure_kr": "톡 터지며 즙 흘러나옴",
        "when_cut_kr": "보라빛 즙 맺힘",
        "visual_identity_en": "fresh blueberry fruit (small round dark blue berry)",
    },
    "mango": {
        "label_kr": "망고",
        "under_pressure_kr": "부드럽게 함몰, 즙 살짝 배어남",
        "when_cut_kr": "노란 단면 노출, 즙 살짝 맺힘",
        "visual_identity_en": "fresh mango fruit (yellow soft sliced or cubed pieces, sometimes glossy from natural fruit juice)",
    },
    "powdered_sugar": {
        "label_kr": "슈가파우더",
        "under_pressure_kr": "흩날리거나 자국 남음",
        "when_cut_kr": "단면에 살짝 묻어남",
        "visual_identity_en": "powdered sugar (fine white dusting)",
    },
    "cocoa_powder": {
        "label_kr": "코코아 파우더",
        "under_pressure_kr": "흩날리거나 자국 남음",
        "when_cut_kr": "단면에 살짝 묻어남",
        "visual_identity_en": "cocoa powder (fine dark brown dusting)",
    },

    # 코팅 / 외피
    "whipped_cream_coating": {
        "label_kr": "생크림 코팅",
        "under_pressure_kr": "옆으로 밀려 퍼짐",
        "when_cut_kr": "매끈한 단면, 가장자리 도구에 묻음",
        "visual_identity_en": "whipped cream coating (smooth white soft dairy outer surface)",
    },
    "mirror_glaze": {
        "label_kr": "미러 글레이즈",
        "under_pressure_kr": "균열 후 안쪽이 흘러나옴",
        "when_cut_kr": "쩍 갈라지며 매끈한 단면 노출",
        "visual_identity_en": "mirror glaze (glossy reflective glassy surface coating)",
    },
}


# 시뮬레이션 → 어느 동작 카테고리인지 (질감 매핑 시 어떤 컬럼 참조할지 결정)
SIMULATION_ACTION_TYPE = {
    "smash":              "under_pressure",  # 누르기 → 압력 받았을 때 반응
    "fork_bite":          "when_cut",        # 한 입 뜨기 → 단면 노출 → 잘렸을 때 반응
    "cut_in_half":        "when_cut",        # 반으로 자르기 → 잘렸을 때 반응
    "cream_scoop":        "under_pressure",  # 크림 떠내기 → 변형 반응 (질척 늘어짐)
    "strawberry_fall":    None,              # 안착 액션 → 질감 가이드 불필요
    "strawberry_cascade": None,              # 안착 액션 → 질감 가이드 불필요
}


def get_texture_guidance(elements: list[str], simulation_id: str) -> str:
    """
    분석 결과에서 추출된 요소 키들 + 시뮬레이션 → 한국어 질감 가이드 텍스트.

    예: elements=["whipped_cream","sponge","strawberry"], simulation="cross_section_cut"
        →  "- 생크림: 부드럽게 갈라짐, 결 따라 매끄럽게 분리
            - 스펀지 시트: 부스러기 발생, 결과 층 노출
            - 딸기: 단면에 즙 맺힘, 빨간 단면 노출"
    """
    action = SIMULATION_ACTION_TYPE.get(simulation_id)
    if action is None or not elements:
        return ""

    key_field = f"{action}_kr"   # "when_cut_kr" or "under_pressure_kr"
    lines = []
    seen_labels = set()
    for elem in elements:
        profile = TEXTURE_PROFILES.get(elem)
        if not profile:
            continue
        label = profile["label_kr"]
        if label in seen_labels:    # 중복 방지 (생크림+부드러운생크림 둘 다 들어와도 한 번만)
            continue
        seen_labels.add(label)
        reaction = profile.get(key_field, "")
        if reaction:
            lines.append(f"- {label}: {reaction}")
    return "\n".join(lines)


# =====================================================================
# 요소 키 정규화 (분석 모델이 변종 이름으로 줄 때 정식 키로 통일)
# =====================================================================
# 분석 모델(Moondream / Gemini Vision) 이 같은 재료를 다양한 변종으로 응답할 수
# 있어서, TEXTURE_PROFILES 의 정식 키로 정규화한다.
# (예: "fluffy_whipped_cream", "fresh_strawberries" → "whipped_cream", "strawberry")
#
# 주의: 별개 의미를 갖는 키는 alias 로 넣지 말 것.
#   - whipped_cream_coating ≠ whipped_cream (위치/맥락 다름. 코팅은 외피)
#   - vanilla_sponge / chocolate_sponge ≠ sponge (색이 다름. 보존됨)
ELEMENT_ALIASES = {
    # 크림 / 필링 변종
    "fluffy_whipped_cream":   "whipped_cream",
    "fluffy_cream":           "whipped_cream",
    "white_whipped_cream":    "whipped_cream",
    "soft_cream":             "cream",
    "mascarpone_texture":     "mascarpone_cream",

    # 시트 / 베이스 변종
    "soft_sponge_layers":     "sponge",
    "sponge_layers":          "sponge",
    "vanilla_sponge_layers":  "vanilla_sponge",
    "chocolate_sponge_layers": "chocolate_sponge",
    "coffee_soaked_layers":   "ladyfinger_biscuit",

    # 딸기 변종
    "fresh_strawberries":     "strawberry",
    "strawberries":           "strawberry",
    "strawberry_slices":      "strawberry",

    # 블루베리 변종
    "blueberries":            "blueberry",

    # 망고 변종 — Gemini Vision / Moondream 이 다양하게 응답 가능
    "mango_cubes":            "mango",
    "mango_jelly_cubes":      "mango",
    "mango_jelly":            "mango",
    "diced_mango":            "mango",
    "fresh_mango":            "mango",
    "yellow_cake_blocks":     "mango",   # Moondream 시절 잔재

    # 파우더 / 더스팅 변종
    "cocoa_dusting":          "cocoa_powder",

    # 코팅 변종
    "cream_coating":          "whipped_cream_coating",
}


def normalize_element(elem: str) -> str:
    """변종 키를 TEXTURE_PROFILES 의 정식 키로 변환. 알 수 없으면 그대로 반환."""
    return ELEMENT_ALIASES.get(elem, elem)


def collect_elements_from_analysis(analysis: dict) -> list[str]:
    """
    Moondream / Gemini Vision 분석 결과(JSON dict)에서 요소 키 목록 추출.
    변종 키는 ELEMENT_ALIASES 로 정규화된 정식 키로 반환되어 downstream
    (TEXTURE_PROFILES 조회) 에서 그대로 사용 가능.
    """
    elements: list[str] = []
    for field in ("creams", "toppings", "base"):
        v = analysis.get(field)
        if isinstance(v, list):
            elements.extend(str(x) for x in v if x)
    coating = analysis.get("coating")
    if coating and coating != "none":
        elements.append(str(coating))
    # 변종 키 → 정식 키로 정규화 (중복 제거하면서 순서는 유지)
    seen = set()
    normalized: list[str] = []
    for e in elements:
        canon = normalize_element(e)
        if canon not in seen:
            seen.add(canon)
            normalized.append(canon)
    return normalized


def get_visual_identities(elements: list[str]) -> str:
    """
    분석 결과에서 추출된 요소들 → I2I 모델용 영어 시각 식별 문장.

    각 요소를 TEXTURE_PROFILES 의 visual_identity_en 에서 찾아서
    "Materials visible in this cake: A; B; C." 형태로 조립.

    nano-banana-pro/edit 가 입력 이미지의 흰 크림을 치즈로 오인하거나
    노란 망고 큐브를 치즈 큐브로 오인하는 등의 시각적 모호성을 차단하기 위한
    positive identification 가이드. instruction_template 앞에 prepend 되어 사용됨.

    예: elements=["whipped_cream", "sponge", "mango"]
        → "Materials visible in this cake: fluffy whipped cream (light, airy, soft
            white dairy cream); sponge cake (soft baked layers with airy crumb texture);
            fresh mango fruit (yellow soft sliced or cubed pieces, ...)."

    매핑되지 않은 요소(visual_identity_en 없음 또는 TEXTURE_PROFILES 미등록)는 무시.
    빈 결과면 빈 문자열 반환.
    """
    identities: list[str] = []
    seen: set[str] = set()
    for elem in elements:
        profile = TEXTURE_PROFILES.get(elem)
        if not profile:
            continue
        visual = profile.get("visual_identity_en", "")
        if visual and visual not in seen:
            seen.add(visual)
            identities.append(visual)
    if not identities:
        return ""
    return "Materials visible in this cake: " + "; ".join(identities) + "."


# =====================================================================
# 품질 속성 — 시트 촉촉도 단계 묘사 (analysis.quality_attributes 에서 추출)
# =====================================================================
# 분석 단계에서 시각적으로 판별 가능한 시트의 촉촉도를 3단계로 매핑.
# 한국어는 LLM Phase 1 (한국어 미리보기) 의 texture_guidance 에 박혀
# 사장님 화면 묘사에 자연스럽게 녹음.
# 영어는 I2I (nano-banana) 의 visual_identity prepend 에 추가되어
# 키프레임에서 시트의 촉촉도 외형이 시각적으로 반영되도록 유도.
MOISTURE_DESCRIPTIONS = {
    "moist": {
        "kr": "촉촉한 (수분이 충분히 살아있고 결이 부드러우며 윤기 있음)",
        "en": "moist sponge with visible moisture sheen on cut faces, soft yielding crumb, well-soaked layers",
    },
    "balanced": {
        "kr": "균형 잡힌 식감의 (촉촉함과 가벼움이 적절한)",
        "en": "sponge with balanced natural moisture, soft crumb, neither dry nor overly wet",
    },
    "dry": {
        "kr": "포슬한 (살짝 건조하고 결이 또렷하며 윤기 적음)",
        "en": "drier sponge with distinct crumb structure, minimal moisture sheen, slightly crumbly texture",
    },
}


def _get_moisture_level(analysis: Optional[dict]) -> Optional[str]:
    """analysis dict 에서 quality_attributes.moisture 안전 추출. 없거나 유효하지 않으면 None."""
    if not analysis:
        return None
    qa = analysis.get("quality_attributes") or {}
    moisture = qa.get("moisture")
    if moisture in MOISTURE_DESCRIPTIONS:
        return moisture
    return None


def get_moisture_descriptor_kr(analysis: Optional[dict]) -> str:
    """
    analysis.quality_attributes.moisture → LLM Phase 1 texture_guidance 용
    한국어 한 줄 묘사. 분석에 quality_attributes 가 없거나 moisture 가 유효하지
    않으면 빈 문자열 (backward compatible — 옛 analysis.json 도 그대로 동작).
    """
    moisture = _get_moisture_level(analysis)
    if moisture is None:
        return ""
    return f"- 시트 촉촉도: {MOISTURE_DESCRIPTIONS[moisture]['kr']}"


def get_moisture_descriptor_en(analysis: Optional[dict]) -> str:
    """
    analysis.quality_attributes.moisture → I2I visual_identity 용 영어 구절.
    분석에 quality_attributes 가 없거나 moisture 가 유효하지 않으면 빈 문자열.
    """
    moisture = _get_moisture_level(analysis)
    if moisture is None:
        return ""
    return MOISTURE_DESCRIPTIONS[moisture]["en"]
