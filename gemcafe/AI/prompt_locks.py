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

확장 방법:
  - 새 시뮬레이션 추가 시 모든 dict에 같은 ID로 한 줄씩 추가.
  - 새 배경 추가 시 BACKGROUND_LABELS_KR + MOOD_LIGHTING 둘 다 추가.
"""

# =====================================================================
# 시뮬레이션 / 배경 한국어 라벨 (사장님 화면 + LLM 슬롯)
# =====================================================================
SIMULATION_LABELS_KR = {
    "cross_section_cut": "단면 자르기 (칼이 위에서 단면을 가르며 들어감)",
    "lift_slice":         "한 조각 들어올리기 (포크로 한 조각을 위로 들어올림)",
    "topping_fall":       "토핑 위에서 떨어지기 (토핑이 케이크 위로 떨어져 안착)",
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
    "cross_section_cut": (
        "Static camera at eye level. Knife enters from top. "
        "Slight push-in as cross-section reveals."
    ),
    "lift_slice": (
        "Camera tracks upward following the lifted slice. "
        "Starts low, ends slightly above."
    ),
    "topping_fall": (
        "Static camera, top-down 45-degree angle. "
        "Captures full cake surface and falling topping briefly."
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
    "cross_section_cut": (
        "no crumbling, no hands holding knife, no cake breaking apart, "
        "preserve cross-section integrity"
    ),
    "lift_slice": (
        "no hands lifting fork, no cream dripping unrealistically, "
        "no plate appearing, slice moves smoothly"
    ),
    "topping_fall": (
        "no toppings bouncing off violently, no excessive splashing, "
        "topping lands naturally and gently"
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
    "cross_section_cut": "6s",
    "lift_slice":         "6s",
    "topping_fall":       "4s",
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
    "whipped_cream":     {"label_kr": "생크림",       "under_pressure_kr": "질척이며 늘어붙고 포크에 묻어남",   "when_cut_kr": "부드럽게 갈라짐, 결 따라 매끄럽게 분리"},
    "fluffy_whipped_cream": {"label_kr": "부드러운 생크림", "under_pressure_kr": "질척이며 늘어붙고 포크에 묻어남", "when_cut_kr": "부드럽게 갈라짐, 결 따라 매끄럽게 분리"},
    "cream":             {"label_kr": "크림",         "under_pressure_kr": "옆으로 밀려 퍼지고 도구에 묻어남",  "when_cut_kr": "부드럽게 갈라짐"},
    "mascarpone_cream":  {"label_kr": "마스카포네 크림", "under_pressure_kr": "두툼하게 밀려 퍼짐",            "when_cut_kr": "매끈한 단면, 살짝 윤기"},
    "ganache":           {"label_kr": "가나슈",       "under_pressure_kr": "천천히 함몰, 광택 유지",          "when_cut_kr": "매끈한 단면, 윤기"},
    "molten_chocolate":  {"label_kr": "흐르는 초콜릿",  "under_pressure_kr": "내부에서 흘러나옴",              "when_cut_kr": "단면에서 진하게 흘러내림"},

    # 베이스 / 시트 류
    "sponge":            {"label_kr": "스펀지 시트",   "under_pressure_kr": "탄력 있게 짓눌렸다 일부 복원",     "when_cut_kr": "부스러기 발생, 결과 층 노출"},
    "soft_sponge_layers":{"label_kr": "부드러운 시트",  "under_pressure_kr": "푹 짓눌렸다 살짝 복원",         "when_cut_kr": "부스러기 발생, 결과 층 노출"},
    "vanilla_sponge":    {"label_kr": "바닐라 스펀지",  "under_pressure_kr": "탄력 있게 짓눌렸다 일부 복원",     "when_cut_kr": "노란빛 결과 층 드러남"},
    "chocolate_sponge":  {"label_kr": "초콜릿 스펀지",  "under_pressure_kr": "탄력 있게 짓눌렸다 일부 복원",     "when_cut_kr": "진한 갈색 결과 층 드러남"},
    "ladyfinger_biscuit":{"label_kr": "레이디핑거",    "under_pressure_kr": "살짝 부서지고 시럽이 배어남",      "when_cut_kr": "단면에 시럽 자국 노출"},
    "mousse":            {"label_kr": "무스",         "under_pressure_kr": "푹 꺼지고 공기층 붕괴",          "when_cut_kr": "매끈하게 베이며 단면 부드러움"},

    # 토핑 류
    "strawberry":        {"label_kr": "딸기",         "under_pressure_kr": "즙 살짝 터짐",                 "when_cut_kr": "단면에 즙 맺힘, 빨간 단면 노출"},
    "fresh_strawberries":{"label_kr": "신선한 딸기",   "under_pressure_kr": "즙 살짝 터짐",                 "when_cut_kr": "단면에 즙 맺힘, 빨간 단면 노출"},
    "blueberry":         {"label_kr": "블루베리",      "under_pressure_kr": "톡 터지며 즙 흘러나옴",           "when_cut_kr": "보라빛 즙 맺힘"},
    "blueberries":       {"label_kr": "블루베리",      "under_pressure_kr": "톡 터지며 즙 흘러나옴",           "when_cut_kr": "보라빛 즙 맺힘"},
    "powdered_sugar":    {"label_kr": "슈가파우더",    "under_pressure_kr": "흩날리거나 자국 남음",            "when_cut_kr": "단면에 살짝 묻어남"},
    "cocoa_powder":      {"label_kr": "코코아 파우더",  "under_pressure_kr": "흩날리거나 자국 남음",            "when_cut_kr": "단면에 살짝 묻어남"},
    "cocoa_dusting":     {"label_kr": "코코아 더스팅",  "under_pressure_kr": "흩날리거나 자국 남음",            "when_cut_kr": "단면에 살짝 묻어남"},

    # 코팅 / 외피
    "whipped_cream_coating": {"label_kr": "생크림 코팅", "under_pressure_kr": "옆으로 밀려 퍼짐",            "when_cut_kr": "매끈한 단면, 가장자리 도구에 묻음"},
    "mirror_glaze":      {"label_kr": "미러 글레이즈",  "under_pressure_kr": "균열 후 안쪽이 흘러나옴",         "when_cut_kr": "쩍 갈라지며 매끈한 단면 노출"},
}


# 시뮬레이션 → 어느 동작 카테고리인지 (질감 매핑 시 어떤 컬럼 참조할지 결정)
SIMULATION_ACTION_TYPE = {
    "cross_section_cut": "when_cut",       # 자르기 → 잘렸을 때 반응
    "lift_slice":         "when_cut",       # 들어올리기도 단면 노출 → 잘렸을 때 반응
    "topping_fall":       None,             # 토핑 떨어지기 → 별도 카테고리 (안착)
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


def collect_elements_from_analysis(analysis: dict) -> list[str]:
    """Moondream 분석 결과(JSON dict)에서 요소 키 목록 추출."""
    elements: list[str] = []
    for field in ("creams", "toppings", "base"):
        v = analysis.get(field)
        if isinstance(v, list):
            elements.extend(str(x) for x in v if x)
    coating = analysis.get("coating")
    if coating and coating != "none":
        elements.append(str(coating))
    return elements
