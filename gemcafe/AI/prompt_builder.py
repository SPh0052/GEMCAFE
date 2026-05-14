"""
시뮬레이션 종류 + focus 요소 → I2I/I2V 프롬프트 자동 생성.

분석 결과(analysis.json)와 사용자 선택(simulation, focus, background, hint)을
조합해서 nano-banana-pro/edit 와 Veo 3.1 에 넘길 프롬프트를 만든다.

지원 디저트: 케이크 (특히 딸기 생크림 조각 케이크) 한정.
지원 요소(focus): sponge / whipped_cream / strawberry
지원 시뮬레이션:
  - smash              (뭉개기)                 — sponge, whipped_cream
  - fork_bite          (포크로 한 입 뜨기)       — sponge, whipped_cream
  - cut_in_half        (반으로 자르기)          — sponge, whipped_cream
  - cream_scoop        (크림만 떠내기)          — whipped_cream
  - strawberry_fall    (딸기가 케이크 위로 떨어짐)— strawberry
  - strawberry_cascade (딸기 우수수 쏟아짐)      — strawberry
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
    "sponge": "sponge cake layers",
    "strawberry": "strawberry",
    "whipped_cream": "whipped cream",
    # 초코 케이크 / 라바 / 가나슈 케이크용
    "ganache": "chocolate ganache",
    "molten_chocolate": "molten chocolate",
    # 티라미수용
    "mascarpone_cream": "mascarpone cream",
    # 치즈케이크용 (Basque / 뉴욕 / 수플레 공통)
    "baked_cheese": "baked cheesecake filling",
}

# Moondream 등이 변형 키를 줄 때 정식 focus 키로 정규화하기 위한 별칭 표.
# /catalog 응답에는 정식 키 3개만 노출하지만, /keyframe 입력은 별칭도 받아준다.
FOCUS_ALIASES = {
    "strawberries": "strawberry",
    "fresh_strawberries": "strawberry",
    "cream": "whipped_cream",
    "fluffy_whipped_cream": "whipped_cream",
    "whipped_cream_coating": "whipped_cream",
    "sponge_layers": "sponge",
    "soft_sponge_layers": "sponge",
    "vanilla_sponge": "sponge",
    "chocolate_sponge": "sponge",  # 시트로 묶음 (시뮬 적용성 동일)

    # 초코 / 가나슈 변종
    "chocolate_ganache": "ganache",
    "dark_ganache": "ganache",
    "glossy_ganache": "ganache",

    # 라바 변종
    "warm_chocolate": "molten_chocolate",
    "flowing_chocolate": "molten_chocolate",
    "lava_filling": "molten_chocolate",
    "molten_center": "molten_chocolate",

    # 티라미수 변종
    "mascarpone": "mascarpone_cream",
    "mascarpone_texture": "mascarpone_cream",

    # 치즈케이크 변종 — 사용자/Gemini suggested_focus 변종을 단일 focus 키로 정규화
    "cheesecake":             "baked_cheese",
    "basque":                 "baked_cheese",
    "basque_cheesecake":      "baked_cheese",
    "new_york_cheesecake":    "baked_cheese",
    "souffle_cheesecake":     "baked_cheese",
    "cheesecake_filling":     "baked_cheese",
    "cream_cheese":           "baked_cheese",
    "cream_cheese_filling":   "baked_cheese",
    "caramelized_top":        "baked_cheese",   # Basque suggested_focus 변종
    "creamy_interior":        "baked_cheese",   # Basque suggested_focus 변종
}


def normalize_focus(focus_key: str) -> str:
    """별칭이면 정식 키로, 정식 키면 그대로 반환. 알 수 없으면 입력 그대로."""
    if focus_key in FOCUS_TEXT:
        return focus_key
    return FOCUS_ALIASES.get(focus_key, focus_key)


def focus_phrase(focus_key: str) -> str:
    """focus 키를 자연어로 변환. 매핑 없으면 underscore만 공백으로 바꿔서 사용."""
    if focus_key in FOCUS_TEXT:
        return FOCUS_TEXT[focus_key]
    return focus_key.replace("_", " ")


# =====================================================================
# 시뮬레이션 정의
# =====================================================================
# 각 시뮬레이션은:
#   - label_kr:             사용자(사장님) 화면 라벨
#   - applicable_focus:     이 시뮬을 적용 가능한 focus 키 목록 (FE 필터링용)
#   - frame_strategy:       "i2i_is_end"   → start=원본,    end=I2I 결과
#                           "i2i_is_start" → start=I2I 결과, end=원본
#   - instruction_template: nano-banana-pro/edit 용 (I2I 키프레임 생성 지시)
#   - video_template:       Veo 3.1 용 (start→end 사이의 동작 묘사)
# 템플릿의 {focus} 자리는 자연어 focus 표현으로 치환됨.
# =====================================================================

SIMULATIONS = {
    # ─────────────────────────────────────────────────────────────────
    "smash": {
        "label_kr": "뭉개기",
        # 누르는 액션 — 부드럽고 변형 가능한 요소만. 흐르는 액체(molten_chocolate)는 부적합.
        # baked_cheese 는 묵직한 점성이지만 함몰/갈라짐 묘사 가능.
        "applicable_focus": [
            "sponge", "whipped_cream", "ganache", "mascarpone_cream", "baked_cheese",
        ],
        "frame_strategy": "i2i_is_end",
        "instruction_template": (
            "Edit the input image for a 9:16 vertical short-form video end frame. "
            "DO NOT regenerate or replace the cake. Use the exact input image as the base. "
            "Preserve the cake pixel-by-pixel: same shape, same toppings, same overall cream "
            "pattern, same plate, same background, same lighting. "
            "ADD ONLY this change: a metal fork is pressed down into the top of the cake from "
            "above, gently compressing the {focus}. A visible indentation forms where the fork "
            "pushes in, with the {focus} squished and slightly spread to the sides. The toppings "
            "stay on the cake but may be slightly displaced. The fork is partially visible above "
            "the cake and partially embedded in it. "
            "Do not regenerate any existing element. Photorealistic, sharp focus, natural lighting."
        ),
        "video_template": (
            "A metal fork descends slowly from above and presses down into the top of the cake, "
            "gently compressing the {focus}. The {focus} visibly squishes and spreads to the "
            "sides under the pressure, while the rest of the cake stays in place. Smooth steady "
            "downward motion. Realistic physics, no morphing of the cake."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "fork_bite": {
        "label_kr": "포크로 한 입 뜨기",
        # 단면 노출 액션 — 모든 cross-section 가시 요소 적용 가능.
        # molten_chocolate 은 한 입 뜨면 단면에서 흘러나오는 게 라바 케이크 시그니처.
        # baked_cheese 는 단일 층 단면이 시그니처 (Basque 의 겉/속 대비 등).
        "applicable_focus": [
            "sponge", "whipped_cream", "ganache", "molten_chocolate",
            "mascarpone_cream", "baked_cheese",
        ],
        "frame_strategy": "i2i_is_end",
        "instruction_template": (
            "Edit the input image to add a 'fork lifting a piece of cake' moment "
            "for a 9:16 vertical short-form video end frame.\n\n"

            "PRESERVE FROM INPUT (highest priority):\n"
            "- Keep the cake body's position, shape, internal layers/fillings, toppings, "
            "cream pattern, plate or liner, colors, and surface texture EXACTLY as in "
            "the input image (pixel-level fidelity)\n"
            "- Keep the background, bokeh, lighting, and color temperature IDENTICAL "
            "to the input\n"
            "- Keep the 9:16 aspect ratio and overall composition unchanged\n"
            "- Do NOT regenerate any existing element\n\n"

            "ADD ONLY THIS — fork lifting a cake piece:\n"
            "- A stainless steel dessert fork enters from the UPPER-RIGHT area of the "
            "frame, angled diagonally with handle pointing toward the upper-right corner\n"
            "- The fork tines hold a bite-sized piece of cake, LIFTED into the air "
            "above the cake body\n"
            "- Position of the lifted piece: in the UPPER half of the frame, clearly "
            "separated from the cake body below with a visible air gap between them "
            "(no visual overlap)\n"
            "- The lifted piece shows a CLEAN CROSS-SECTION revealing the cake's "
            "actual internal structure — layers, fillings, and inclusions that truly "
            "exist inside the cake in the input image. The {focus} is clearly visible "
            "and emphasized as the most prominent feature on the exposed cross-section. "
            "Faithfully reflect whatever is actually inside the cake; do NOT invent "
            "layers, fillings, or textures that are not visible in the original\n"
            "- On the cake body below, in an area that AVOIDS any prominent whole "
            "topping (such as a whole fruit or a decorative piece sitting on top), a "
            "matching bite-sized wedge-shaped indentation is visible where the piece "
            "was taken from, exposing the same cross-section, with the {focus} also "
            "clearly visible inside the cavity\n"
            "- A few small crumbs may be falling between the lifted piece and the "
            "cake body\n"
            "- Between the lifted piece and the cake body there should be ONLY clean "
            "air — do not draw any stretched filling, dripping cream, honey-like "
            "strand, melted strand, or flowing material connecting them, unless the "
            "cake's actual filling is explicitly a flowing molten substance (e.g. "
            "molten chocolate lava). For all other fillings (whipped cream, mascarpone, "
            "cream cheese, ganache, custard, etc.) the connection between the bite and "
            "the cake must be cleanly broken with no visible string or strand\n\n"

            "CONSTRAINTS:\n"
            "- The lifted piece and the cake body MUST NOT visually overlap\n"
            "- The fork and the cake body MUST NOT visually overlap (except through "
            "the lifted piece)\n"
            "- Cross-section on both the lifted piece and the remaining cake body must "
            "be visually consistent (same internal structure)\n"
            "- All toppings and decorations on the cake's surface (except in the small "
            "indentation area) remain intact and undisturbed\n"
            "- The plate or liner, camera angle, lighting, background, and overall "
            "composition must remain identical to the input\n"
            "- Photorealistic, shallow depth of field with SHARP FOCUS on the LIFTED "
            "PIECE and the fork tines holding it; the cake body below in noticeably "
            "softer focus as supporting context (the lifted piece is the unambiguous "
            "subject of the frame)"
        ),
        "video_template": (
            "A silver dessert fork enters the frame from the upper right and slowly descends "
            "toward the cake. The fork tines press straight down into the top of the cake, "
            "sinking through every layer of the cake all the way to the base. The fork then "
            "lifts smoothly back up, scooping out a single full-height bite that stays "
            "impaled on the tines, revealing the cake's actual inner cross-section on the "
            "cut faces, with the {focus} clearly visible and emphasized as the most "
            "prominent feature on the exposed cross-section. As the fork rises, it settles "
            "in the upper right area of the frame, clearly separated from the cake with "
            "empty space between them. The cake stays in place on whatever surface or liner "
            "it sits on throughout the motion; any toppings or decorations on the cake's "
            "surface that are not in the direct path of the fork remain intact and "
            "undisturbed. Shallow depth of field, clean photorealistic dessert advertising "
            "aesthetic, smooth and graceful motion, no abrupt cuts."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "cut_in_half": {
        "label_kr": "반으로 자르기",
        # 단면 노출 액션 — 모든 cross-section 가시 요소 적용 가능.
        "applicable_focus": [
            "sponge", "whipped_cream", "ganache", "molten_chocolate",
            "mascarpone_cream", "baked_cheese",
        ],
        "frame_strategy": "i2i_is_end",
        "instruction_template": (
            "Edit this image for a 9:16 vertical short-form video end frame, showing the "
            "fork now embedded inside the cake, having just cut into it.\n\n"
            "The fork enters the frame from behind the cake, with the handle extending away "
            "from the camera into the background. The fork tines push forward through the "
            "cake toward the camera, so the cut opens up facing the camera, exposing the "
            "cross-section directly to the viewer.\n\n"
            "The fork is sunk into the cake, with its tines buried deep below the surface "
            "where it entered. A clear, continuous gap has formed in the cake exactly along "
            "the fork's body — the crack starts where the fork meets the cake's surface, "
            "runs in the same direction the fork is pointing, and ends at the buried tips of "
            "the tines. The fork is physically inside this gap, not floating beside it.\n\n"
            "The cake is in a partially cut state. The upper portion, where the fork has "
            "already passed, is split open into two halves. The lower portion remains as a "
            "single solid piece of cake — continuous, unbroken, with sponge and cream fully "
            "connected across the middle.\n\n"
            "The gap runs in the exact same direction the fork traveled, and extends only as "
            "far down as the fork has cut.\n\n"
            "The sponge and cream are pushed apart on both sides of the fork, revealing the "
            "internal texture in sharp detail, with the {focus} clearly emphasized as the "
            "most prominent and detailed feature on the exposed cross-section:\n\n"
            "- the airy, fluffy crumb structure of the sponge cake, with individual air "
            "pockets visible\n"
            "- the soft, billowy texture of the whipped cream, with delicate ridges and folds\n"
            "- any fillings, fruits, or layers inside, exposed at the split with vivid color "
            "and natural texture\n\n"
            "Photorealistic food photography, ultra-detailed texture, ASMR-style food "
            "cinematography aesthetic, soft natural lighting, emphasis on tactile texture "
            "and freshness."
        ),
        "video_template": (
            "A silver fork enters the frame from behind the cake and slowly cuts downward "
            "through the top of the cake, slicing it open from top to bottom. As the fork "
            "descends, the sponge and cream are gently pushed apart along the fork's path, "
            "gradually revealing the cake's internal texture — the soft, airy crumb of the "
            "sponge, the billowy folds of whipped cream, and any fruits or fillings inside, "
            "exposed with vivid color and natural texture, with the {focus} clearly "
            "emphasized as the most prominent and detailed texture on the exposed "
            "cross-section.\n\n"
            "The fork moves at a steady, deliberate pace — slow enough to savor each moment "
            "of the cut, like an ASMR food video. The cream slightly spreads, the sponge "
            "softly parts, and tiny details of the moist crumb become visible as the camera "
            "moves closer.\n\n"
            "Soft, natural daylight. Shallow depth of field that deepens as the camera moves "
            "in. Photorealistic food cinematography, ultra-detailed texture, ASMR-style food "
            "video aesthetic, emphasis on tactile texture, moisture, and freshness."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "cream_scoop": {
        "label_kr": "크림만 떠내기",
        # 부드러운 dollop 떠올리는 액션 — 점성 크림류만. molten_chocolate 은 액체라 부적합.
        "applicable_focus": ["whipped_cream", "ganache", "mascarpone_cream"],
        "frame_strategy": "i2i_is_end",
        # 시작 프레임 액션 — background 교체 단계에 합쳐서 한 번에 호출됨
        # (background 가 None 이면 적용되지 않음. 호출 수 추가하지 않기 위해서.)
        # i2v 시작 → 끝 사이 모션이 자연스러우려면 시작 프레임에 이미 숟가락이
        # 케이크 위에 떠 있는 "막 떠내려는 순간 직전" 상태여야 함.
        "start_frame_action": (
            "add a clean stainless steel dessert spoon entering from the upper part of "
            "the frame, hovering just above the top of the cake with its bowl facing "
            "down toward the cream surface, as if about to scoop but NOT YET touching "
            "the cake. The spoon is empty with no cream on it, no scooped material, no "
            "dollop. A clear air gap remains between the spoon's bowl and the cake "
            "surface. The cake's top remains completely undisturbed — no indentation, "
            "no displaced cream, no missing topping."
        ),
        "instruction_template": (
            "Edit the input image for a 9:16 vertical short-form video end frame. "
            "DO NOT regenerate or replace the cake. Use the exact input image as the base. "
            "Preserve the cake pixel-by-pixel: same shape, same toppings, same overall cream "
            "pattern, same plate, same background, same lighting. "
            "ADD ONLY this change: a metal spoon is scooping out a small soft dollop of "
            "{focus} from the top of the cake, lifted slightly upward. The spoon holds a "
            "clean rounded mound of {focus} that keeps its shape on the spoon. A small smooth "
            "indentation is visible on the cake where the {focus} was scooped from. The "
            "toppings on the cake remain undisturbed. "
            "Do not alter the rest of the image. Photorealistic, sharp focus, natural lighting."
        ),
        "video_template": (
            "A metal spoon scoops a small soft dollop of {focus} from the top of the cake and "
            "lifts it gently upward. The {focus} separates cleanly from the cake, forming a "
            "soft rounded mound on the spoon that holds its shape. Smooth gentle motion, "
            "realistic physics, no morphing of the cake."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "strawberry_fall": {
        "label_kr": "딸기가 케이크 위로 톡 떨어진다",
        "applicable_focus": ["strawberry"],
        "frame_strategy": "i2i_is_start",   # 역방향: I2I = 딸기 없는 시작 상태
        "instruction_template": (
            "Edit the input image for a 9:16 vertical short-form video start frame. "
            "DO NOT regenerate or replace the cake. Use the exact input image as the base. "
            "Preserve the cake pixel-by-pixel: same shape, same cream, same plate, same "
            "background, same lighting. "
            "ONLY remove the {focus} from the top of the cake. The cake should look complete "
            "but without the {focus} — as if the {focus} hasn't been placed on it yet. Keep the "
            "cream surface where the {focus} was, smooth and natural, as if untouched. "
            "Do not change anything else. Photorealistic, sharp focus, natural lighting."
        ),
        "video_template": (
            "A single {focus} falls gently from above and lands softly on top of the cake, "
            "settling into its natural position on the cream with a slight bounce on impact. "
            "The cake itself stays still. No morphing, no extra elements appear."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "strawberry_cascade": {
        "label_kr": "딸기가 우수수 쏟아진다",
        "applicable_focus": ["strawberry"],
        "frame_strategy": "i2i_is_start",   # 역방향: I2I = 토핑 없는 시작 상태
        "instruction_template": (
            "Edit the input image for a 9:16 vertical short-form video start frame. "
            "Remove all toppings, fruits, decorations, garnishes, and any objects placed "
            "on the top surface of the cake, including any existing {focus} pieces "
            "already on top. This also includes any berries, chocolate pieces, nuts, "
            "flowers, edible decorations, sauces, drizzles, dustings, gold leaf, herbs, "
            "or any other items resting on top. Keep the cake's sides, base, height, "
            "shape, and overall structure completely unchanged. Preserve all side "
            "details exactly as they are, including any wrappers, ribbons, bands, text, "
            "logos, plaques, frosting patterns, or coatings on the sides of the cake. "
            "Keep the original background, lighting, camera angle, perspective, shadows, "
            "and product photography style identical to the input image. Replace the "
            "top surface with a smooth, evenly spread layer of the cake's existing top "
            "material (such as whipped cream, frosting, ganache, or glaze) matching the "
            "color and texture already visible on the cake. The top should look flat, "
            "clean, and ready to receive {focus} pieces as toppings. Do not add any new "
            "decorations, toppings, fruits, or garnishes. Maintain the exact same cake "
            "position, size, and framing in the image."
        ),
        "video_template": (
            "Fresh {focus} pieces cascade from above the frame onto the cake's top "
            "surface. Slow-motion fall: the {focus} pieces tumble through the air, "
            "bounce on the surface with subtle deformation, and settle into a dense "
            "even arrangement that progressively covers the entire top of the cake. "
            "Small water droplets glisten on their natural surface, with the {focus} "
            "emphasized as the most prominent visual element in the scene. Static "
            "camera, soft diffused studio lighting, shallow depth of field, premium "
            "food commercial aesthetic, hyper-realistic textures."
        ),
    },
}


# =====================================================================
# focus → 적용 가능 시뮬레이션 키 리스트 (SIMULATIONS에서 자동 도출)
# /catalog 응답과 검증에 사용.
# =====================================================================
def _build_focus_simulations() -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = {focus: [] for focus in FOCUS_TEXT}
    for sim_key, sim_def in SIMULATIONS.items():
        for focus in sim_def["applicable_focus"]:
            mapping.setdefault(focus, []).append(sim_key)
    return mapping


FOCUS_SIMULATIONS = _build_focus_simulations()


def is_valid_combination(focus: str, simulation: str) -> bool:
    """focus × simulation 조합이 카탈로그에 정의된 유효 조합인지 확인."""
    normalized = normalize_focus(focus)
    sim = SIMULATIONS.get(simulation)
    if not sim:
        return False
    return normalized in sim["applicable_focus"]


# =====================================================================
# 시스템 프롬프트 (모든 시뮬레이션 공통 — 보존 페르소나)
# =====================================================================
SYSTEM_PROMPT = (
    "You are a precise photo editor. Your only job is to preserve the input image "
    "pixel-by-pixel and apply ONLY the specific edit requested. "
    "Never regenerate, replace, or reinterpret existing elements. "
    "Treat the input image as immutable except for the explicit changes requested. "
    # 비율 충돌 시 우선순위 명시 (input 비율과 output 비율이 다를 때):
    # 케이크 자체 보존이 절대 우위 — 비율 맞추려고 케이크 자르거나 변형 금지.
    "PRIORITY RULE: cake preservation overrides aspect ratio fitting. If the input "
    "image's aspect ratio differs from the requested output canvas (e.g. a square "
    "input rendered into a 9:16 vertical canvas), EXTEND the surrounding background "
    "and surface context to fill the new canvas — never crop, reshape, squash, "
    "stretch, or distort the cake itself, its toppings, decorations, or its "
    "immediate plate/liner to fit the new aspect ratio. The cake must remain "
    "pixel-faithful to the input regardless of the target canvas shape."
)


# =====================================================================
# 배경 교체용 I2I 지시문 — 케이크는 보존하고 배경/면만 교체
# (배경 키 → 영어 묘사 매핑은 prompt_locks.MOOD_LIGHTING 단일 소스 사용)
# =====================================================================
BACKGROUND_INSTRUCTION_TEMPLATE = (
    "DO NOT change the cake itself. Use the exact input image as the base. "
    "ONLY replace the background and the surface the cake sits on with: {bg_text}. "
    "Preserve the cake pixel-by-pixel: the exact same cake shape, the exact toppings, "
    "the exact cream pattern, the exact plate/liner, and the exact lighting on the cake. "
    "Match the lighting direction of the new background so the cake looks naturally placed. "
    "Do not redraw, recolor, or reinterpret any part of the cake itself. "
    "Photorealistic, sharp focus."
)

# 배경 교체 + 시뮬레이션별 시작 프레임 액션 합본 템플릿.
# 시뮬레이션에 start_frame_action 이 정의돼 있고 background 도 같이 지정된 경우에만
# 사용 — nano-banana 호출 1번에 두 변경을 동시에 적용 (추가 호출 없음).
BACKGROUND_WITH_START_FRAME_TEMPLATE = (
    "Edit the input image to create a 9:16 vertical short-form video start frame. "
    "Apply TWO changes together: "
    "(1) Replace the background and the surface the cake sits on with: {bg_text}. "
    "Match the lighting direction of the new background so the cake looks naturally placed. "
    "(2) {start_action} "
    "Otherwise preserve the cake pixel-by-pixel: the exact same cake shape, the exact "
    "toppings, the exact cream pattern, the exact plate/liner, and the exact lighting on "
    "the cake itself. Do not redraw, recolor, or reinterpret any part of the cake. "
    "Photorealistic, sharp focus."
)


def build_background_prompt(background_key: str, simulation: Optional[str] = None) -> str:
    """
    배경 교체용 I2I 지시문 생성. 배경 묘사는 prompt_locks.MOOD_LIGHTING 사용.

    simulation 이 주어지고 해당 시뮬레이션에 start_frame_action 이 정의돼 있으면,
    배경 교체와 시작 프레임 액션을 합쳐서 한 번의 nano-banana 호출에 같이 적용한다
    (예: cream_scoop 에선 배경 교체와 동시에 숟가락이 케이크 위에 떠있는 시작 자세
    부여). simulation 미지정이거나 start_frame_action 이 없으면 기존 배경-only
    프롬프트로 폴백 (backward compat).
    """
    import prompt_locks
    bg_text = prompt_locks.get_mood_lighting(background_key)
    if not bg_text:
        raise ValueError(
            f"알 수 없는 background: {background_key}. "
            f"가능한 값: {list(prompt_locks.MOOD_LIGHTING.keys())}"
        )
    start_action = None
    if simulation:
        sim_def = SIMULATIONS.get(simulation)
        if sim_def:
            start_action = sim_def.get("start_frame_action")
    if start_action:
        return BACKGROUND_WITH_START_FRAME_TEMPLATE.format(
            bg_text=bg_text, start_action=start_action
        )
    return BACKGROUND_INSTRUCTION_TEMPLATE.format(bg_text=bg_text)


# =====================================================================
# 핵심 빌더 함수
# =====================================================================
def build_prompts(
    simulation: str,
    focus: str,
    background: Optional[str] = None,
    hint: Optional[str] = None,
    analysis: Optional[dict] = None,
) -> dict:
    """
    Args:
        simulation: SIMULATIONS의 키 ("cross_section_cut", "lift_slice", "topping_fall")
        focus:      강조할 요소 키 (예: "strawberry", "whipped_cream", "sponge_layers")
        background: 배경 키워드 (예: "wooden table", "white marble") — 선택
        hint:       사용자 자유 추가 힌트 — 선택
        analysis:   Moondream 분석 결과 dict — 있으면 instruction_prompt 앞에
                    visual identity 가이드("Materials visible in this cake: ...")가
                    자동 prepend 되어 nano-banana 가 입력 이미지의 재료를 정확히
                    인식하도록 도움. 없으면 가이드 생략(backward compatible).

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

    # focus 정규화 (별칭이면 정식 키로). 검증은 호출자(API 레이어)가 담당.
    focus = normalize_focus(focus)
    sim = SIMULATIONS[simulation]
    focus_text = focus_phrase(focus)

    instruction = sim["instruction_template"].format(focus=focus_text)
    video = sim["video_template"].format(focus=focus_text)

    # analysis 가 있으면 케이크 구조 컨텍스트 (역할별 base/cream/topping/coating + 시각 식별)
    # 를 instruction 앞에 prepend. 모델이 "어떤 재료가 어느 자리에 있는지" 명확히 인식해서
    # 액션 묘사 시 모든 요소를 자연스럽게 활용 가능. 빈 슬롯은 자동 omit.
    # (이전 get_visual_identities 의 flat list 대비, 역할 정보가 살아있어서 fork_bite /
    #  cut_in_half 같은 cross-section 시뮬레이션에서 LLM 이 cream 안 topping 같은
    #  요소 간 관계도 묘사 가능.)
    if analysis is not None:
        import prompt_locks
        structure_ctx = prompt_locks.get_cake_structure_context_en(analysis)
        if structure_ctx:
            instruction = f"{structure_ctx}\n\n{instruction}"

    # 배경/힌트가 있으면 프롬프트 끝에 덧붙임.
    # 배경은 prompt_locks.MOOD_LIGHTING의 자연어 묘사로 변환 (raw 키 박지 않음).
    extras = []
    if background:
        import prompt_locks
        bg_text = prompt_locks.get_mood_lighting(background)
        if bg_text:
            extras.append(f"Setting: {bg_text}.")
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
    사장님 선택값을 LLM(Gemini 2.5 Flash-Lite via SSAFY GMS)에 넘겨 자연스러운 한국어 미리보기 생성.

    cake_elements: 분석 결과에서 추출된 요소 키 리스트
                  (예: ["whipped_cream", "sponge", "strawberry"])
                  → prompt_locks.TEXTURE_PROFILES와 매칭되어 LLM에 질감 가이드로 공급.
    analysis:     Moondream 분석 결과 dict가 있으면 cake_elements를 자동 추출.
                  cake_elements가 직접 주어지면 그게 우선.

    /preview-prompts 엔드포인트가 이 결과를 사장님에게 보여주고 편집 가능하게 함.
    """
    # llm_client는 여기서 import (Gemini 키 없어도 다른 함수는 동작하도록)
    from llm_client import generate_korean_preview, expand_hint
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

    # dessert_info 에 케이크 구조 정보(역할별 시트/크림/토핑/코팅) 보강.
    # 예: "딸기 생크림 조각 케이크" → "딸기 생크림 조각 케이크 (시트: 스펀지 시트, 크림: 생크림, 토핑: 딸기)"
    # LLM 이 "크림 안에 있던 딸기가 단면에 드러난다" 같이 요소 간 관계를 묘사하도록 컨텍스트 제공.
    # analysis 없거나 매핑 없는 요소뿐이면 suffix 가 빈 문자열 → 기존 동작 유지.
    if analysis is not None:
        structure_suffix = prompt_locks.get_cake_structure_suffix_kr(analysis)
        if structure_suffix:
            dessert_info = f"{dessert_info}{structure_suffix}"

    # hint가 있으면 LLM으로 4가지 측면(조명/모션/분위기/시각적 디테일)으로 확장.
    # 짧은 힌트("고급스럽게")를 풍부한 키워드로 풀어 Phase 1 입력 품질 향상.
    enriched_hint = hint
    if hint and hint.strip():
        expanded = expand_hint(hint)
        if expanded:   # JSON 파싱 성공 시 (실패하면 원본 hint 그대로)
            enriched_hint = (
                f"{hint} "
                f"(조명: {expanded.get('조명', '')}; "
                f"모션: {expanded.get('모션', '')}; "
                f"분위기: {expanded.get('분위기', '')}; "
                f"시각적 디테일: {expanded.get('시각적_디테일', '')})"
            )

    return generate_korean_preview(
        dessert_info=dessert_info,
        focus_label_kr=focus_kr,
        simulation_label_kr=sim_label_kr,
        background_label_kr=bg_label_kr,
        user_hint=enriched_hint,
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
    focus: Optional[str] = None,
) -> dict:
    """
    사장님이 (편집한) 한국어 영상 묘사 → 영상 모델용 최종 영어 프롬프트로 변환.

    1. LLM(Gemini 2.5 Flash-Lite via SSAFY GMS)이 한국어 → 영어 영상 프롬프트로 의역
    2. 시스템이 잠금 라이브러리(카메라/기술/모델별/배경/길이/부정)를 결합
    3. fal.ai에 그대로 넘길 수 있는 dict 반환

    focus 가 주어지면 카메라 디렉티브가 (simulation × focus) 조합에 맞게
    선택됨 — 같은 시뮬레이션이라도 강조 요소에 따라 카메라가 무엇을 잡는지
    달라진다.

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

    # 2) 잠금 영역 조합 — focus 가 있으면 정식 키로 정규화 후 카메라 조회
    canonical_focus = normalize_focus(focus) if focus else None
    camera = prompt_locks.get_camera(simulation, focus=canonical_focus)
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
# 단독 실행 시 — 카탈로그상 모든 유효 조합 미리보기
# =====================================================================
if __name__ == "__main__":
    for sim_id, sim_def in SIMULATIONS.items():
        for focus in sim_def["applicable_focus"]:
            print("=" * 70)
            print(f"[{sim_id}] × [{focus}]  →  {sim_def['label_kr']}")
            print("=" * 70)
            p = build_prompts(sim_id, focus)
            print(f"\n[I2I 지시문]")
            print(p["instruction_prompt"])
            print(f"\n[I2V 영상 프롬프트]")
            print(p["video_prompt"])
            print(f"\n[frame_strategy] {p['frame_strategy']}")
            print()
