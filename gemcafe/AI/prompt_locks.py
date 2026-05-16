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

from typing import Optional


# =====================================================================
# 시뮬레이션 / 배경 한국어 라벨 (사장님 화면 + LLM 슬롯)
# =====================================================================
SIMULATION_LABELS_KR = {
    "smash":              "뭉개기 (포크가 케이크 위를 눌러 살짝 짓누름)",
    "fork_bite":          "포크로 한 입 뜨기 (포크가 케이크 한 입 분량을 떠 들어올림)",
    "cut_in_half":        "칼로 단면 가르기 (케이크 나이프가 수직으로 갈라 단면 노출)",
    "lift_slice":         "한 조각 쏙 들어올리기 (케이크 서버가 홀케이크에서 슬라이스를 통째 들어올림)",
    "cream_scoop":        "크림만 떠내기 (숟가락이 케이크 위 크림 한 덩이만 떠올림)",
    "hand_split":         "손으로 반 가르기 (두 손이 슬라이스를 양옆으로 깔끔하게 가름)",
    "topping_fall":       "위에서 떨어뜨리기 (토핑이 위에서 떨어져 안착 — 단일·다량 자동)",
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
        "Steady camera at a slight high angle. Camera focus tracks the LIFTED PIECE "
        "on the fork tines — sharp focus on the bite and the fork; the cake body "
        "below stays in noticeably softer focus as supporting context. Framing keeps "
        "both visible but the lifted piece is the unambiguous visual emphasis. "
        "Shallow depth of field exaggerates the focus separation."
    ),
    "cut_in_half": (
        "Camera starts framed on the full cake slice in vertical 9:16 composition, "
        "then slowly and continuously pushes in to an extreme macro close-up on the "
        "split area where the knife meets the cake. Knife enters from behind the cake "
        "with the handle extending away from the camera into the background."
    ),
    "cream_scoop": (
        "Camera remains locked and completely still throughout the shot — no panning, "
        "no zooming, no shaking, no tilting. Tight framing centered on the dessert's "
        "exposed cut face which fills the middle of the composition. Eye-level angle, "
        "head-on view of the cut face."
    ),
    "topping_fall": (
        "Static camera, top-down 45-degree angle, vertical 9:16 composition with "
        "the cake framed in the lower-center of the frame and ample vertical room "
        "above where one or more topping pieces fall from. Captures the full cake "
        "surface as the pieces fall and settle naturally."
    ),
    "lift_slice": (
        "Static camera at slightly low eye-level, vertical 9:16 composition. The "
        "frame holds the whole cake in the lower portion with ample headroom above. "
        "Camera tilts very subtly upward as the slice rises, keeping the gap between "
        "the lifted slice and the whole cake below clearly visible. Shallow depth "
        "of field focuses on the cut faces of the lifted slice; the cake body below "
        "stays in noticeably softer focus."
    ),
    "hand_split": (
        "Static camera at slight high angle, vertical 9:16 composition centered on "
        "the slice. As the two halves separate, the camera holds steady and lets "
        "the gap widen into frame symmetry. Macro close-up on the freshly exposed "
        "inner faces of both halves once they are pulled apart."
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
        "subtitles, captions, distorted knife, bent knife, deformed knife, multiple knives, "
        "knife changing shape, serrated bread knife, jagged blade, fork, fork tines, "
        "cake moving on its own, cake rotating, cake bouncing, "
        "shaky camera, handheld camera shake, jittery motion, abrupt camera cuts, "
        "sudden zoom jumps, flickering, color shifting, blurry artifacts, low quality, "
        "oversaturated colors, cartoon style, illustration, 3D render look, "
        "plastic-looking food, fake-looking cream"
    ),
    "cream_scoop": (
        "bare hands, hands without gloves, white gloves, latex gloves, gloves of any color "
        "other than black, third hand, more than two hands, only one hand visible after the "
        "right hand enters, missing left hand, dessert falling, dessert collapsing, dessert "
        "crumbling apart, broken chunks falling off the dessert as a whole, dessert sliding "
        "out of the gripping hand, hand changing grip position mid-shot, palm touching the "
        "top burnt crust, palm touching the bottom surface, dessert held perfectly vertical, "
        "rectangular channel, straight-edged channel, angular channel, shallow surface "
        "scrape instead of a deep scooped channel, channel covering the full width of the "
        "cut face, panning camera, zooming camera, shaking camera, tilting camera, "
        "deformed spoon, bent spoon"
    ),
    "topping_fall": (
        "no topping pieces bouncing off violently, no excessive splashing, "
        "no pieces rolling off the cake, each piece lands naturally and gently "
        "in a stable resting position"
    ),
    "lift_slice": (
        "bare hands, fingers, person, second tool, fork, knife, deformed cake "
        "server, bent cake server, multiple servers, slice tilting mid-lift, "
        "slice wobbling, slice collapsing, crumbs falling from the slice, "
        "dripping cream during the lift, whole cake sliding, whole cake "
        "rotating, shaky camera, abrupt zoom, sudden cuts, missing wedge gap "
        "where the slice was, stretched filling between the slice and the cake "
        "(unless the cake's filling is explicitly a flowing molten substance)"
    ),
    "hand_split": (
        "bare hands, hands without gloves, white gloves, gloves of any color "
        "other than black, third hand, more than two hands, stretching cream "
        "strands, stringing dairy, sticky filling pulling between the halves, "
        "dripping material across the gap, morphing cake halves, deformed slice "
        "halves, crumbs floating in the gap, plate sliding, shaking camera, "
        "abrupt zoom"
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
    "lift_slice":         "4s",
    "cream_scoop":        "6s",
    "hand_split":         "6s",
    "topping_fall":       "6s",
    "default":            "6s",
}


# =====================================================================
# 요소별 카메라 거동 (focus 강조용 — base 카메라에 덧붙여 시각 핵심 강조)
# =====================================================================
# 같은 시뮬레이션이라도 사용자가 선택한 요소(focus)에 따라 카메라가 무엇에
# 머물러야 하는지가 달라짐. 이 dict는 simulation 카메라 디렉티브 뒤에 짧게
# 덧붙여서 해당 요소의 시각적 핵심을 강조한다.
#
# 어휘 가이드:
#   - whipped_cream / mascarpone_cream / baked_cheese 는 ductile 아님 →
#     stretch / strand / pull / string 단어 사용 금지.
#     대신 dollop / peaks / satin / pillowy / holds its shape 사용.
#   - ganache / molten_chocolate 만 viscous strand / slow flow 등 늘어남
#     관련 어휘 허용 (실제로 점성 ductile 재료이므로).
ELEMENT_CAMERA_BEHAVIORS = {
    "sponge": (
        "Focus lingers on the crumb texture; rim light skims across the cake "
        "surface to catch individual air pockets and the layered baked structure."
    ),
    "whipped_cream": (
        "Focus favors the cream's soft peaks and satin highlights, holding on "
        "pillowy ridges and the clean tool-cut edges; the cream holds its shape "
        "as a clean dollop with no stringing or trailing."
    ),
    "ganache": (
        "Focus favors the glossy reflective surface of the ganache; rim light "
        "catches the high gloss along contours and any thick viscous trails on "
        "tools or freshly cut edges."
    ),
    "molten_chocolate": (
        "Focus holds on the inner flow; camera lingers on the slow viscous pour "
        "of warm chocolate streaming out of the cake and any glossy threads "
        "trailing from tools."
    ),
    "mascarpone_cream": (
        "Focus favors the dense satin surface of the mascarpone and its slight "
        "sheen; tight focus on the clean tool-cut edges where the mascarpone "
        "keeps a crisp, undisturbed shape."
    ),
    "baked_cheese": (
        "Focus favors the dense satin cross-section and any caramelized top "
        "contrast; tight focus holds on the smooth pale interior, the crisp "
        "tool-cut edges, and the filling clinging without any stretching."
    ),
    "strawberry": (
        "Focus catches the glossy red surface of the berries and the natural "
        "water droplets, holding briefly on each highlight as they settle."
    ),
}


# =====================================================================
# (시뮬레이션 × 요소) 카메라 오버라이드 — 강한 시너지 조합만
# =====================================================================
# get_camera() 는 이 dict 를 먼저 조회한 뒤, 없으면 base CAMERA_DIRECTIVES +
# ELEMENT_CAMERA_BEHAVIORS 조합으로 폴백한다. 여기엔 base+behavior 단순 결합
# 만으로 부족한 — 카메라 동선 자체가 요소에 따라 달라져야 하는 조합만 정의.
# 신규 조합 추가 전에 base+behavior 로 충분한지 먼저 검증할 것.
CAMERA_OVERRIDES = {
    ("cut_in_half", "whipped_cream"): (
        "Camera starts framed on the full cake slice in vertical 9:16 composition, "
        "then slowly and continuously pushes in to a macro close-up on the splitting "
        "cross-section. Focus settles on the layered cream bands revealed between "
        "sponge layers — pillowy ridges, satin highlights, and the clean knife-cut "
        "faces where the cream keeps its shape with no stringing."
    ),
    ("cut_in_half", "molten_chocolate"): (
        "Camera starts framed on the full cake in vertical 9:16 composition, then "
        "slowly pushes in toward the cake's center as the cut opens. Camera holds "
        "on the moment warm chocolate first appears at the cut line and begins to "
        "flow; macro close-up follows the slow viscous stream as it runs down the "
        "exposed cross-section."
    ),
    ("cut_in_half", "ganache"): (
        "Camera starts framed on the full cake slice in vertical 9:16 composition, "
        "then slowly and continuously pushes in to a macro close-up on the splitting "
        "cross-section. Focus settles on the freshly exposed ganache layer — glossy "
        "reflective bands catching rim light, with thick viscous trails clinging to "
        "the knife where the cake parts."
    ),
    ("fork_bite", "whipped_cream"): (
        "Steady camera at a slight high angle. Focus tracks the LIFTED PIECE on "
        "the fork tines, holding on the soft cream peak that comes up with the "
        "bite — pillowy ridges and satin highlights on a clean dollop that keeps "
        "its shape with no stringing back to the cake. The cake body below stays "
        "in noticeably softer focus as supporting context."
    ),
    ("fork_bite", "molten_chocolate"): (
        "Steady camera at a slight high angle. Focus tracks the LIFTED PIECE on "
        "the fork tines as it rises, holding on the warm dark chocolate streaming "
        "from the exposed cross-section. Macro close-up follows the slow viscous "
        "flow and the glossy threads trailing back toward the cake. The cake body "
        "below stays in noticeably softer focus."
    ),
    ("fork_bite", "ganache"): (
        "Steady camera at a slight high angle. Focus tracks the LIFTED PIECE on "
        "the fork tines, holding on the thick glossy ganache clinging to the tines "
        "and freshly exposed faces. Rim light catches the high gloss along contours "
        "of cake and tool. The cake body below stays in noticeably softer focus."
    ),
    # 주의: cream_scoop x (whipped_cream/ganache/mascarpone_cream) override 는
    # S14P31S307-643 에서 의도적으로 제거됨. 새 cream_scoop 디자인은 locked-camera
    # 로 단면 정면을 잡는 통일된 카메라라 focus 별 카메라 차별화가 의미 없음 —
    # focus 별 시각적 강조는 ELEMENT_CAMERA_BEHAVIORS 가 base 카메라 뒤에 자동
    # 결합돼서 처리.
}


# =====================================================================
# 헬퍼 — 키 조회 시 default fallback
# =====================================================================
def get_camera(simulation_id: str, focus: Optional[str] = None) -> str:
    """
    카메라 디렉티브 조회.

    조회 우선순위:
      1) (simulation_id, focus) in CAMERA_OVERRIDES → 오버라이드 그대로 사용
      2) CAMERA_DIRECTIVES[simulation_id] + ELEMENT_CAMERA_BEHAVIORS[focus]
      3) CAMERA_DIRECTIVES["default"]

    focus 가 None 이면 base simulation 카메라만 반환 (backward compat).
    focus 는 FOCUS_TEXT 정식 키 (sponge / whipped_cream / ... ) 가정 —
    호출 측에서 normalize_focus 로 정규화 후 전달할 것.
    """
    if focus:
        override = CAMERA_OVERRIDES.get((simulation_id, focus))
        if override:
            return override
    base = CAMERA_DIRECTIVES.get(simulation_id, CAMERA_DIRECTIVES["default"])
    if focus:
        behavior = ELEMENT_CAMERA_BEHAVIORS.get(focus)
        if behavior:
            return base + " " + behavior
    return base


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
        # 마스카포네는 두툼한 점성 유제품. 들거나 자를 때 늘어지지 않고 깔끔하게 끊어짐
        # — whipped_cream 보다 무겁고 ganache 보다 가벼움.
        "under_pressure_kr": (
            "두툼하고 묵직한 질감이 도구의 압력에 천천히 옆으로 밀려 퍼지며 살짝 윤기가 "
            "흐르고 도구에 진하게 묻어남. 들어올릴 때 늘어지지 않고 깔끔하게 끊어짐."
        ),
        "when_cut_kr": (
            "매끈하고 균질한 단면이 살짝 윤기를 띠며 깔끔하게 갈라짐. 결이 없는 점성 "
            "질감이라 늘어지거나 부스러지지 않고 단면 모서리가 또렷함."
        ),
        "visual_identity_en": "mascarpone cream (rich Italian dairy with smooth surface and slight sheen)",
    },
    "ganache": {
        "label_kr": "가나슈",
        # 가나슈는 식어서 광택 있는 점성 초콜릿. 차가운 상태면 부드럽게 함몰되고
        # 따뜻한 상태면 살짝 늘어남. 카페 메뉴 기준 "잘 굳은 광택" 상태로 가정.
        "under_pressure_kr": (
            "광택 있는 점성 표면이 도구 압력에 천천히 함몰되며 진한 광택을 유지함. "
            "도구에 진하게 묻어나면서 살짝 늘어지다 끊어지고, 함몰 자국 가장자리에 "
            "윤기가 흐름."
        ),
        "when_cut_kr": (
            "매끈한 단면이 강한 윤기를 띠며 깔끔하게 갈라짐. 단면 양쪽에 도구를 따라 "
            "얇은 점성 자국이 남고, 진한 갈색이 또렷이 노출됨."
        ),
        "visual_identity_en": "chocolate ganache (smooth glossy thick chocolate cream)",
    },
    "molten_chocolate": {
        "label_kr": "흐르는 초콜릿",
        # 라바 케이크의 시그니처 — 따뜻한 점성 액체. 자르면 내부에서 천천히 흘러나오며
        # 늘어지다 가는 실처럼 끊어짐. 단면에서 흘러내리는 모습이 핵심 비주얼.
        "under_pressure_kr": (
            "따뜻한 점성 액체가 내부에서 천천히 흘러나오며 도구에 끈적하게 늘어붙음. "
            "들어올릴 때 가는 실처럼 늘어지다 천천히 끊어지고, 흐른 자국에 진한 광택이 "
            "남음."
        ),
        "when_cut_kr": (
            "단면을 가르는 순간 내부의 따뜻한 초콜릿이 천천히 흘러나와 진한 갈색 강이 "
            "흘러내림. 점성 액체가 도구 양쪽에 늘어붙으며 가는 실처럼 늘어지다 끊어지고, "
            "단면 아래쪽에 광택 있는 웅덩이가 고임."
        ),
        "visual_identity_en": "molten chocolate (warm dark flowing chocolate sauce with viscous glossy texture)",
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
    "baked_cheese": {
        # ⚠️ 모델이 "cheese" 단어 보면 모짜렐라/체다처럼 늘어지고 녹는 치즈로 오해석함
        # (Basque 영상에서 꿀처럼 줄줄 흐르는 strand 아티팩트 발생).
        # 모든 묘사에서 "치즈" → "크림치즈" 일관, 부정 표현(전단/늘어남 없음) 명시적.
        "label_kr": "베이크드 크림치즈",
        "under_pressure_kr": (
            "차가운 크림치즈 필링이 압력에 따라 꾸덕하게 압축되다가, 임계점에서 "
            "부드럽게 밀려나며 갈라짐. 고밀도 점성 덕분에 으깨지기보다는 형태를 "
            "유지하며 묵직하게 쪼개짐. 실 같은 점착성이나 늘어남 없이 단면이 매끈하게 "
            "노출됨."
        ),
        "when_cut_kr": (
            "결 없이 균일하고 매끈한 단면. 도구가 지나간 자리에 미세한 질감의 자국이 "
            "남으며, 도구 면에 크림 일부가 두텁게 달라붙을 정도로 점착성이 있음. "
            "그러나 실처럼 가느다랗게 늘어지는 탄성은 전혀 없으며, 단면은 연두부보다 "
            "밀도 높은 푸딩이나 커스터드처럼 정적인 상태를 유지함. 수분기를 머금은 "
            "은은한 반무광 표면. Basque 의 경우 겉면의 탄화된 거친 갈색 질감과 속의 "
            "실크 같은 매끈한 크림색 단면이 극명한 대비를 이룸."
        ),
        "visual_identity_en": (
            "baked cream cheese filling (highly dense, non-elastic, smooth texture; "
            "behaves like chilled thick custard or pudding; clean sheared edges when "
            "cut, NOT stretchy or stringy; zero stringiness, melt, or fibers like "
            "mozzarella or cheddar; satin / semi-matte cream-colored interior; "
            "visible stickiness on the cutting tool but no stretching fibers; "
            "Basque-style has dramatic contrast between caramelized darker rough top "
            "and silk-smooth pale interior)"
        ),
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
    "lift_slice":         "when_cut",        # 슬라이스 들기 → 단면 노출 → 잘렸을 때 반응
    "cream_scoop":        "under_pressure",  # 크림 떠내기 → 변형 반응 (질척 늘어짐)
    "hand_split":         "when_cut",        # 손으로 반 가르기 → 단면 노출
    "topping_fall":       None,              # 안착 액션 → 질감 가이드 불필요
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

    # 초코/가나슈 변종 (분석 결과 정규화 — focus aliases 와 키 일관성 유지)
    "chocolate_ganache":      "ganache",
    "dark_ganache":           "ganache",
    "glossy_ganache":         "ganache",

    # 라바/흐르는 초콜릿 변종
    "warm_chocolate":         "molten_chocolate",
    "flowing_chocolate":      "molten_chocolate",
    "lava_filling":           "molten_chocolate",
    "molten_center":          "molten_chocolate",

    # 치즈케이크 변종 — Basque / 뉴욕 / 수플레 / 일반 치즈케이크 모두 단일 키로 매핑.
    # (스타일별 시각적 차이는 visual_identity_en 안에서 묘사됨)
    "basque_cheesecake":      "baked_cheese",
    "new_york_cheesecake":    "baked_cheese",
    "souffle_cheesecake":     "baked_cheese",
    "cheesecake_filling":     "baked_cheese",
    "cheese_filling":         "baked_cheese",
    "cream_cheese_filling":   "baked_cheese",
    "baked_cheesecake":       "baked_cheese",
    "caramelized_top":        "baked_cheese",   # Basque suggested_focus 변종
    "creamy_interior":        "baked_cheese",   # Basque suggested_focus 변종
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
# 역할별 (base / cream / topping / coating) 요소 수집 + 구조 컨텍스트
# (Optional slot — focus 만 활용하던 액션 묘사를 풍부하게 만들기 위한 인프라)
# =====================================================================
# 기존 collect_elements_from_analysis 는 모든 요소를 flat list 로 반환하지만,
# I2I 모델 / LLM Phase 1 한국어 미리보기에는 "어느 역할 자리에 어떤 재료가 있는지"
# 가 더 유용. 예: "크림 안에 있던 파인애플이 으스러진다" 같은 요소 간 관계 묘사.
# 빈 슬롯은 자동 omit 되므로 단일 층 케이크 (Basque, 시폰 등) 도 무리없이 처리.
_ROLE_TO_ANALYSIS_FIELD = {
    "base":    "base",      # 시트
    "cream":   "creams",    # 크림/필링
    "topping": "toppings",  # 토핑
}

# I2I 영어 컨텍스트용 라벨
_ROLE_LABELS_EN = {
    "base":    "Base",
    "cream":   "Cream",
    "topping": "Topping",
    "coating": "Coating",
}

# LLM Phase 1 한국어 dessert_info 보강용 라벨
_ROLE_LABELS_KR = {
    "base":    "시트",
    "cream":   "크림",
    "topping": "토핑",
    "coating": "코팅",
}


def collect_elements_by_role(analysis: dict) -> dict[str, list[str]]:
    """
    분석 결과 dict → 역할별 정규화된 요소 dict.

    반환:
        {
          "base":    ["sponge"],
          "cream":   ["whipped_cream"],
          "topping": ["strawberry"],
          "coating": ["whipped_cream_coating"],   # 없으면 []
        }
    각 요소는 ELEMENT_ALIASES 로 정식 키로 정규화. 중복 제거. 빈 슬롯은 빈 리스트.
    """
    out: dict[str, list[str]] = {}
    for role_key, analysis_key in _ROLE_TO_ANALYSIS_FIELD.items():
        v = analysis.get(analysis_key)
        normalized: list[str] = []
        if isinstance(v, list):
            seen: set[str] = set()
            for e in v:
                if not e:
                    continue
                canon = normalize_element(str(e))
                if canon and canon not in seen:
                    seen.add(canon)
                    normalized.append(canon)
        out[role_key] = normalized

    # coating 은 단일 문자열 필드 (또는 "none")
    coating = analysis.get("coating")
    if coating and coating != "none":
        out["coating"] = [normalize_element(str(coating))]
    else:
        out["coating"] = []
    return out


def get_cake_structure_context_en(analysis: dict) -> str:
    """
    분석 결과 → I2I 모델 (nano-banana-pro/edit) 용 영어 케이크 구조 컨텍스트.

    visual_identity_en 을 역할별로 묶어서, 모델이 "어떤 재료가 어느 자리에 있는지"
    명확히 인식하도록 도움. instruction_template 앞에 prepend 되어 사용.

    빈 슬롯은 자동 omit → Basque (base 만) 같은 단순 구조도 자연스럽게 처리됨.
    TEXTURE_PROFILES 에 매핑 없는 요소는 무시 → backward compatible.
    완전히 빈 결과면 빈 문자열 반환.

    예 (생크림+딸기 케이크):
        "Cake structure visible in this image:
        - Base: sponge cake (soft baked layers with airy crumb texture)
        - Cream: whipped cream (light, airy, soft white dairy cream)
        - Topping: fresh strawberry fruit (red whole or sliced berry)

        The edit must faithfully reflect this structure — do not invent layers,
        fillings, or toppings that are not visible in the original image."

    예 (Basque 치즈케이크 — base 만):
        "Cake structure visible in this image:
        - Base: baked cheese (...)

        The edit must faithfully reflect this structure — do not invent layers,
        fillings, or toppings that are not visible in the original image."
    """
    by_role = collect_elements_by_role(analysis)
    lines: list[str] = []
    for role_key, label_en in _ROLE_LABELS_EN.items():
        elements = by_role.get(role_key, [])
        identities: list[str] = []
        seen: set[str] = set()
        for elem in elements:
            profile = TEXTURE_PROFILES.get(elem)
            if not profile:
                continue
            v = profile.get("visual_identity_en", "")
            if v and v not in seen:
                seen.add(v)
                identities.append(v)
        if identities:
            lines.append(f"- {label_en}: " + "; ".join(identities))
    if not lines:
        return ""
    return (
        "Cake structure visible in this image:\n"
        + "\n".join(lines)
        + "\n\nThe edit must faithfully reflect this structure — "
        + "do not invent layers, fillings, or toppings that are not visible in the original image."
    )


def get_cake_structure_suffix_kr(analysis: dict) -> str:
    """
    분석 결과 → LLM Phase 1 (한국어 미리보기) 용 dessert_info 보강 한국어 접미사.

    LLM 이 "크림 안에 있던 딸기가 단면에 드러난다" 같이 요소 간 관계를 묘사할 수
    있도록, dessert_info 뒤에 붙는 짧은 구조 정보. 빈 슬롯은 자동 omit.

    반환 예 (생크림+딸기):
        " (시트: 스펀지 시트, 크림: 생크림, 토핑: 딸기)"

    반환 예 (Basque, base 만):
        " (시트: 바스크 베이크드 치즈)"

    매핑 없는 요소 / 분석 비어있으면 "" (빈 문자열).
    """
    by_role = collect_elements_by_role(analysis)
    parts: list[str] = []
    for role_key, label_kr in _ROLE_LABELS_KR.items():
        elements = by_role.get(role_key, [])
        labels: list[str] = []
        seen: set[str] = set()
        for elem in elements:
            profile = TEXTURE_PROFILES.get(elem)
            if not profile:
                continue
            lbl = profile.get("label_kr", "")
            if lbl and lbl not in seen:
                seen.add(lbl)
                labels.append(lbl)
        if labels:
            parts.append(f"{label_kr}: " + ", ".join(labels))
    if not parts:
        return ""
    return " (" + ", ".join(parts) + ")"
