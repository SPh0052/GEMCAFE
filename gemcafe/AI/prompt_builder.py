"""
시뮬레이션 종류 + focus 요소 → I2I/I2V 프롬프트 자동 생성.

분석 결과(analysis.json)와 사용자 선택(simulation, focus, background, hint)을
조합해서 nano-banana-pro/edit 와 Veo 3.1 에 넘길 프롬프트를 만든다.

지원 디저트: 케이크 (특히 딸기 생크림 조각 케이크) 한정.

시뮬레이션은 [시트 / 크림 / 토핑] 3개 카테고리로 분류되며, 각 카테고리는
analysis 의 해당 역할(base/cream/topping)에서 focus 를 자동 결정한다.
사장님이 직접 focus 를 지정하지 않아도 카테고리만 보고 분석 결과의 첫 요소를
자동 선택. (호환을 위해 명시적 focus 파라미터도 여전히 받음.)

카테고리별 시뮬레이션:
  [시트]  fork_bite     (포크로 한 입 뜨기)
          cut_in_half   (칼로 단면 가르기)
          lift_slice    (한 조각 쏙 들어올리기)
  [크림]  smash         (뭉개기)
          cream_scoop   (한 스푼 떠내기)
          hand_split    (손으로 반 가르기)
  [토핑]  topping_fall  (위에서 떨어뜨리기 — 단일·다량 자동)
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
    # 무스 케이크용 (chocolate mousse / fruit mousse 공통)
    "mousse": "mousse",
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

    # 무스 변종
    "chocolate_mousse":  "mousse",
    "fruit_mousse":      "mousse",
    "strawberry_mousse": "mousse",
    "mousse_filling":    "mousse",
    "mousse_layer":      "mousse",

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
        "category": "cream",   # 크림류를 짓눌러 변형 — 카테고리 자동 focus 는 cream 역할
        # 누르는 액션 — 부드럽고 변형 가능한 요소만. 흐르는 액체(molten_chocolate)는 부적합.
        # baked_cheese 는 묵직한 점성이지만 함몰/갈라짐 묘사 가능.
        # mousse 는 가벼운 거품 구조라 누르면 푹 꺼지는 시그니처 묘사 가능.
        "applicable_focus": [
            "sponge", "whipped_cream", "ganache", "mascarpone_cream", "baked_cheese",
            "mousse",
        ],
        "frame_strategy": "i2i_is_end",
        # 슬롯 phrase: 케이크 구성에 따라 자동 채워짐. base/topping 없으면 통째 omit.
        "slot_phrases": {
            "instruction": {
                "base":    ". The {value} body beneath the indentation stays largely intact, only slightly compressed where the fork pushes down",
                "topping": ". Any {value} on top of the cake stays in place but may be slightly displaced",
            },
            "video": {
                "topping": "; the {value} on top stays in place but may shift slightly",
            },
        },
        "instruction_template": (
            "Edit the input image for a 9:16 vertical short-form video end frame. "
            "DO NOT regenerate or replace the cake. Use the exact input image as the base. "
            "Preserve the cake pixel-by-pixel: same shape, same toppings, same overall cream "
            "pattern, same plate, same background, same lighting. "
            "ADD ONLY this change: a metal fork is pressed down into the top of the cake from "
            "above, gently compressing the {focus}. A visible indentation forms where the fork "
            "pushes in, with the {focus} squished and slightly spread to the sides{topping}{base}{texture}. "
            "The fork is partially visible above the cake and partially embedded in it. "
            "Do not regenerate any existing element. Photorealistic, sharp focus, natural lighting."
        ),
        "video_template": (
            "A metal fork descends slowly from above and presses down into the top of the cake, "
            "gently compressing the {focus}. The {focus} visibly squishes and spreads to the "
            "sides under the pressure, while the rest of the cake stays in place{topping}{texture}. "
            "Smooth steady downward motion. Realistic physics, no morphing of the cake."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "fork_bite": {
        "label_kr": "포크로 한 입 뜨기",
        "category": "sheet",   # 시트 단면을 노출 — 카테고리 자동 focus 는 base 역할
        # 단면 노출 액션 — 모든 cross-section 가시 요소 적용 가능.
        # molten_chocolate 은 한 입 뜨면 단면에서 흘러나오는 게 라바 케이크 시그니처.
        # baked_cheese 는 단일 층 단면이 시그니처 (Basque 의 겉/속 대비 등).
        # mousse 는 비단 같은 매끈한 단면 노출이 시그니처.
        "applicable_focus": [
            "sponge", "whipped_cream", "ganache", "molten_chocolate",
            "mascarpone_cream", "baked_cheese", "mousse",
        ],
        "frame_strategy": "i2i_is_end",
        # 슬롯 phrase: 단면에 함께 노출되는 cream/topping 을 자연스럽게 묘사.
        # cream/topping 없는 단일층 케이크(Basque 등)면 통째 omit.
        "slot_phrases": {
            "instruction": {
                "cream":   ", with the {value} also visible as a distinct band on the cut faces",
                "topping": "; a small portion of the {value} from the cake surface may come up with the bite, partially visible on top of the lifted piece",
            },
            "video": {
                "cream":   "; the {value} between sheet layers also becomes visible at the cut faces",
            },
        },
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
            "and emphasized as the most prominent feature on the exposed cross-section"
            "{cream}{topping}{interior_structure}{texture}. "
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
            "prominent feature on the exposed cross-section{cream}{interior_structure}{texture}. As the fork rises, it settles "
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
        "label_kr": "칼로 단면 가르기",
        "category": "sheet",   # 시트 단면을 가르며 노출 — 카테고리 자동 focus 는 base 역할
        # 단면 노출 액션 — 모든 cross-section 가시 요소 적용 가능.
        # 도구: 케이크 나이프 (S14P31S307-624 에서 fork → knife 로 변경)
        # mousse 는 매끈한 단면이 시그니처 — 칼로 가르기 적합.
        "applicable_focus": [
            "sponge", "whipped_cream", "ganache", "molten_chocolate",
            "mascarpone_cream", "baked_cheese", "mousse",
        ],
        "frame_strategy": "i2i_is_end",
        "slot_phrases": {
            "instruction": {
                "cream":   "; the {value} between sheet layers spreads softly to either side of the cut and remains clearly visible on both exposed faces",
                "topping": "; any {value} on the cake surface stays in place except where the blade has passed",
            },
            "video": {
                "cream":   "; the {value} between sheet layers slowly parts along the blade's path",
            },
        },
        "instruction_template": (
            "Edit this image for a 9:16 vertical short-form video end frame, showing a "
            "cake knife now embedded inside the cake, having just cut into it.\n\n"
            "The knife enters the frame from behind the cake, with the handle extending "
            "away from the camera into the background. The knife blade pushes forward "
            "through the cake toward the camera, so the cut opens up facing the camera, "
            "exposing the cross-section directly to the viewer.\n\n"
            "The knife is sunk into the cake, with its blade buried deep below the surface "
            "where it entered. A clear, continuous gap has formed in the cake exactly along "
            "the blade — the crack starts where the blade meets the cake's surface, runs in "
            "the same direction the blade is pointing, and ends at the buried tip of the "
            "blade. The knife is physically inside this gap, not floating beside it.\n\n"
            "The cake is in a partially cut state. The upper portion, where the blade has "
            "already passed, is split open into two halves. The lower portion remains as a "
            "single solid piece of cake — continuous, unbroken, with internal structure "
            "fully connected across the middle.\n\n"
            "The gap runs in the exact same direction the blade traveled, and extends only "
            "as far down as the blade has cut.\n\n"
            "The cake's internal layers are pushed apart on both sides of the blade, "
            "revealing the internal texture in sharp detail, with the {focus} clearly "
            "emphasized as the most prominent and detailed feature on the exposed "
            "cross-section{cream}{topping}{interior_structure}{texture}.\n\n"
            "Photorealistic food photography, ultra-detailed texture, ASMR-style food "
            "cinematography aesthetic, soft natural lighting, emphasis on tactile texture "
            "and freshness."
        ),
        "video_template": (
            "A polished cake knife enters the frame from behind the cake and slowly cuts "
            "downward through the top of the cake, slicing it open from top to bottom. As "
            "the blade descends, the cake's internal layers are gently pushed apart along "
            "the blade's path, gradually revealing the cake's internal texture — exposed "
            "with vivid color and natural texture, with the {focus} clearly emphasized as "
            "the most prominent and detailed texture on the exposed cross-section{cream}{interior_structure}{texture}.\n\n"
            "The knife moves at a steady, deliberate pace — slow enough to savor each "
            "moment of the cut, like an ASMR food video. The cake's internal structure "
            "softly parts along the blade, and tiny details of the moist interior become "
            "visible as the camera moves closer.\n\n"
            "Soft, natural daylight. Shallow depth of field that deepens as the camera "
            "moves in. Photorealistic food cinematography, ultra-detailed texture, "
            "ASMR-style food video aesthetic, emphasis on tactile texture, moisture, and "
            "freshness."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "cream_scoop": {
        "label_kr": "크림만 떠내기",
        "category": "cream",   # 크림을 스푼으로 떠냄 — 카테고리 자동 focus 는 cream 역할
        # 새 디자인 (S14P31S307-643): 슬라이스 단면을 정면으로 잡고 스푼이 위에서 아래로
        # 끌어내려 채널을 긁어내는 액션. 두 손(검은 장갑) 가시. 두꺼운 점성 단면이 있는
        # 모든 필링류에 적용 가능 — 크림류 + 베이크드 치즈케이크 (Basque/뉴욕 단면).
        # mousse 도 부드러운 점성 단면이라 스푼으로 떠낼 수 있음.
        "applicable_focus": [
            "whipped_cream", "ganache", "mascarpone_cream", "baked_cheese", "mousse",
        ],
        "frame_strategy": "i2i_is_end",
        # 시작 프레임 — 별도 nano-banana 호출로 첫 프레임 생성 (호출 1번 추가).
        # 결과가 base_url 이 되고, 그게 다시 last-frame I2I 의 입력이 됨 (체인).
        "start_frame_template": (
            "Edit the provided image of a sliced piece of dessert (cut into a triangular "
            "or wedge shape, with the following four flat surfaces: ONE top surface, ONE "
            "bottom surface, and TWO side cut faces created by slicing — these two side "
            "cut faces expose the {focus} of the dessert).\n\n"

            "A single human left hand wearing a black food-safe nitrile glove enters the "
            "frame from the lower-left and supports the dessert. CRITICAL: The dessert is "
            "rotated and held so that one of the two side cut faces (the ones exposing the "
            "{focus}) rests against the open palm of the gloved hand. The cut face touching "
            "the palm is HIDDEN from the camera, pressed against the glove.\n\n"

            "The OTHER side cut face — also exposing the {focus} — now faces toward the "
            "camera, presented roughly head-on. This camera-facing cut face shows the "
            "dessert's full {focus}, fills the center of the composition, and is the main "
            "visual focus.\n\n"

            "IMPORTANT — dessert tilt: The dessert is NOT held perfectly vertical. Instead, "
            "it is tilted slightly counter-clockwise (rotated about 8 to 12 degrees from "
            "vertical) — the top portion of the dessert leans slightly to the upper-right, "
            "and the bottom portion is slightly to the lower-left. This natural tilt "
            "reflects how a human left hand and wrist naturally angle when supporting an "
            "object from below. The tilt is subtle and natural, NOT dramatic or extreme — "
            "the dessert should still look stable and securely held, not falling.\n\n"

            "The top surface (with the dark burnt crust) is now oriented to one side "
            "(either left or right edge of the frame, not facing up). The bottom surface "
            "is oriented to the opposite side. NEITHER the top surface NOR the bottom "
            "surface is touching the palm. The palm ONLY touches a side cut face.\n\n"

            "Only ONE hand is visible in the frame — the left hand supporting the dessert. "
            "Do NOT add a second hand. Do NOT let the palm touch the bottom of the "
            "dessert. Do NOT let the palm touch the top burnt crust.\n\n"

            "The dessert is held roughly at the same height and position within the frame "
            "as it originally was, so the background and surface below remain visible "
            "behind and beneath the hand.\n\n"

            "Preserve the exact same background, the same surface beneath, the same "
            "lighting direction and quality, the same camera height and distance, and the "
            "same overall photographic style as the original image. Do not change the "
            "dessert itself (its size, color, crust, or interior). Photorealistic, "
            "high-detail food photography style, shallow depth of field focused on the "
            "exposed cut face of the dessert facing the camera."
        ),
        "instruction_template": (
            "Edit the provided image while preserving the exact same camera angle, "
            "framing, aspect ratio, lighting, background, and the dessert's overall "
            "position, size, orientation, and tilt. The LEFT gloved hand supporting the "
            "dessert remains in the exact same position and grip as in the input image — "
            "do not move it, do not change the finger positions, do not change the palm "
            "angle.\n\n"

            "Modification: A second human right hand wearing a black food-safe nitrile "
            "glove enters the frame from the upper-right, holding a polished stainless "
            "steel dessert spoon with a rounded oval-shaped bowl. The right hand has just "
            "finished dragging the spoon downward along the dessert's exposed flat cut "
            "face (the wide {focus} surface facing the camera), scooping out a long "
            "vertical channel from near the top burnt edge all the way down toward the "
            "bottom of the cut face.\n\n"

            "The spoon is now positioned near the BOTTOM of the cut face, having ended "
            "its downward stroke. The handle points toward the upper-right corner of the "
            "frame, the bowl points down and slightly into the dessert.\n\n"

            "The channel carved into the cut face follows the shape of the rounded spoon "
            "bowl that made it — the top, bottom, and side edges of the channel are all "
            "gently curved (NOT straight lines, NOT rectangular, NOT angular). The channel "
            "is genuinely scooped deep into the dessert, to roughly the full depth of the "
            "spoon's bowl, with concave curved walls.\n\n"

            "The channel covers roughly the middle 50 to 60 percent of the cut face "
            "width, with clear margins of the original untouched cut face remaining on "
            "BOTH the left side near the burnt crust AND the right side.\n\n"

            "A generous heap of {focus}, freshly scooped out from the entire length of "
            "the channel, sits piled on top of the spoon's bowl, mounded above the rim "
            "of the bowl{texture}.\n\n"

            "The dessert remains whole and intact otherwise: no chunks have broken off "
            "the dessert as a whole, no pieces have fallen, the dessert is NOT crumbling "
            "apart structurally. The dark burnt crust on the left side remains intact.\n\n"

            "Both hands are now visible in the frame — the left hand still supporting "
            "the dessert exactly as before, the right hand operating the spoon. Do not "
            "change the dessert's position or orientation, the left hand's grip, the "
            "background, the lighting direction, the shadows, or the camera perspective. "
            "Photorealistic, high-detail food photography style."
        ),
        "video_template": (
            "A black-gloved left hand holds the dessert steady throughout. A black-gloved "
            "right hand enters the frame from the upper-right edge holding a stainless "
            "steel dessert spoon, and brings the spoon to the top portion of the dessert's "
            "exposed cut face. In a single smooth, continuous, deliberate motion, the "
            "spoon presses into the cut face near the top and drags downward along the "
            "center of the cut face, scooping out a long vertical channel in one fluid "
            "stroke from top to bottom. As the spoon drags down, it gradually accumulates "
            "a heap of {focus} on its bowl{texture}. Camera remains locked and still, no panning, "
            "no zooming, no shaking, no tilting."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "lift_slice": {
        "label_kr": "한 조각 쏙 들어올리기",
        "category": "sheet",   # 시트 슬라이스 통째 들어올림 — base 역할
        # 2단계 I2I 체인 (cream_scoop 와 동일 패턴):
        #   start_frame_template — 입력 슬라이스로 홀케이크를 재구성한 시작 프레임
        #   instruction_template — 그 홀케이크에서 슬라이스가 떠올려진 마지막 프레임
        # 영상 = 홀케이크 → 한 조각이 케이크 서버로 떠올라 빈 wedge 가 드러남.
        # mousse 케이크도 단단히 set 된 슬라이스 형태라 통째로 들어올리는 묘사 가능.
        "applicable_focus": [
            "sponge", "vanilla_sponge", "chocolate_sponge",
            "baked_cheese", "ladyfinger_biscuit", "mousse",
        ],
        "frame_strategy": "i2i_is_end",
        "slot_phrases": {
            "instruction": {
                "cream":   "; the {value} between sheet layers remains crisply defined on both cut faces of the lifted slice",
                "topping": ". Any {value} on top of the slice stays securely in place on the slice's surface during the lift",
            },
            "video": {
                "cream":   "; the {value} layers stay neatly stacked through the lift, no smearing or shifting",
            },
        },
        # 1단계 — 입력 슬라이스 이미지로부터 홀케이크를 상상·재구성한 시작 프레임.
        # 슬라이스는 wedge 형태로 자리에 그대로 (pre-cut line 만 미세하게) — 다음
        # 프레임에서 케이크 서버로 들어올려질 수 있도록 들기 직전 상태로 셋팅.
        # 카메라 프레이밍은 후속 lift 액션을 위해 cake 위쪽에 headroom 확보 +
        # 우하단을 비워둠 (서버가 들어올 자리).
        "start_frame_template": (
            "From the input dessert slice image, reconstruct the COMPLETE WHOLE "
            "ROUND CAKE from which this slice was originally cut. The slice "
            "must be shown back in its original position within the whole cake "
            "— one wedge seamlessly fitted with the rest, as if the cake has "
            "been pre-cut but not yet served.\n\n"

            "Infer the number of slices naturally from the wedge angle of the "
            "input slice (do not force a specific count). The whole cake should "
            "look proportional and convincing.\n\n"

            "PRESERVE EXACTLY from the input slice:\n"
            "- Base layers (if present): their count, colors, and thicknesses\n"
            "- Filling pattern between layers (if present): thickness, color, texture\n"
            "- Toppings on top: type, color, arrangement, and size\n"
            "- Side coating and frosting style\n"
            "- Overall design language, color palette, and decorative finish\n\n"

            "EXTEND the design naturally around the full cake:\n"
            "- Top decoration repeats in radial symmetry around the circle\n"
            "- Side coating wraps continuously around the full circumference\n"
            "- Internal layers extend uniformly through the entire cake\n\n"

            "PRE-CUT LINE:\n"
            "The whole cake shows ONE faint, clean cut line on its top surface, "
            "marking where one wedge has been pre-cut from the cake. The cut "
            "line is barely visible — just a thin, subtle separation line. "
            "The wedge itself remains perfectly in place, seated flush with "
            "the rest of the cake, with no visible gap or displacement. From "
            "a casual glance the cake looks whole, but on close inspection "
            "one wedge is clearly ready to be lifted.\n\n"

            "The whole cake sits on a clean white round ceramic plate.\n\n"

            "Camera: slightly low eye-level angle, gently tilted downward "
            "toward the cake — the camera looks at the cake from roughly the "
            "same height as the cake's top, with a slight downward tilt that "
            "keeps BOTH the top surface AND a significant portion of the "
            "cake's side wall clearly visible. This is NOT a top-down shot; "
            "the side of the cake must be clearly seen.\n\n"

            "Frame the shot as if the camera is positioned farther back from "
            "the cake, so that the cake appears modestly sized within the "
            "image — occupying roughly the lower 60% of the frame vertically, "
            "centered horizontally. The upper 40% of the frame above the cake "
            "must remain empty space, providing generous headroom for an "
            "object to be lifted high above the cake later.\n\n"

            "Also keep the lower-right corner of the frame clear and "
            "uncluttered (this space will be used in the next frame — keep "
            "it empty).\n\n"

            "Soft, even studio lighting from the upper-left, casting a gentle "
            "natural shadow to the lower-right side of the cake.\n\n"

            "Strictly NO utensils, NO hands, NO cake server, NO fork, NO knife "
            "anywhere in the frame.\n\n"

            "Style: photorealistic, high-end commercial food photography, crisp "
            "focus on the cake, fine detail on cream texture and toppings.\n\n"

            "Output: a single still image of the whole cake with one wedge "
            "pre-cut but seated in place, ready to be lifted."
        ),
        # 2단계 — 그 홀케이크(pre-cut wedge 포함)에서 슬라이스가 케이크 서버로
        # 떠올려진 마지막 프레임. start_frame 의 pre-cut line 을 그대로 wedge gap
        # 으로 매칭. 카메라/조명/플레이트 모두 input 이미지 보존.
        "instruction_template": (
            "Edit the input whole cake image to show the pre-cut wedge slice "
            "LIFTED UP and away from the cake by a stainless steel cake server.\n\n"

            "THE LIFTED SLICE:\n\n"
            "- The slice that gets lifted is exactly the wedge that was "
            "pre-cut in the input image — its position, size, and angle "
            "must match the existing cut line in the input exactly\n"
            "- Held on the flat triangular blade of a stainless steel cake "
            "server\n"
            "- Lifted high above the plate with clear, generous empty space "
            "between the bottom of the slice and the plate surface — the "
            "slice should appear distinctly elevated, with the bottom of "
            "the slice positioned roughly at the same height as the top "
            "surface of the remaining cake (so the lifted slice sits "
            "visually \"above\" the cake, not \"beside\" it)\n"
            "- Tilted slightly so the server's handle side is a bit lower "
            "than the pointed tip side — this angle clearly reveals both "
            "cut faces of the slice, with{?base: the {base},}{?cream: the "
            "{cream},} and internal structure fully visible in cross-section\n"
            "- The slice's internal structure (as shown in the input image) "
            "is IDENTICAL to the original\n\n"

            "THE REMAINING CAKE:\n\n"
            "- Stays in place on the same white round ceramic plate, in the "
            "same position as in the input image\n"
            "- A clean wedge-shaped empty gap is now visible where the slice "
            "was lifted from — this gap follows the exact pre-cut line that "
            "was shown in the input image, matching the lifted slice's size "
            "and angle exactly\n"
            "- The inner walls of the gap show clean cross-sections{?base: "
            "of the {base}}{?cream: with the {cream} between them}, "
            "identical in structure to the lifted slice's cut faces\n"
            "- All other parts of the cake remain intact and untouched\n\n"

            "THE CAKE SERVER:\n\n"
            "- Stainless steel, polished finish with soft reflections\n"
            "- Entering from the lower-right side of the frame, with the "
            "handle extending out toward the lower-right edge of the frame\n"
            "- The blade is fully under the lifted slice, supporting it from "
            "below\n\n"

            "PRESERVE FROM THE INPUT IMAGE (must remain unchanged):\n\n"
            "- The exact same camera angle and framing as the input image\n"
            "- The exact same lighting direction and shadow direction\n"
            "- The same white round ceramic plate, in the same position\n"
            "- The same background\n"
            "- The cake's overall position within the frame\n\n"

            "Strictly NO hands, NO fork, NO knife, NO additional utensils "
            "anywhere in the frame — only the stainless steel cake server.\n\n"

            "Style: photorealistic, high-end commercial food photography, crisp "
            "focus on the lifted slice with both cut faces sharp and detailed, "
            "the remaining cake softly in focus.\n\n"

            "Output: a single still image of the slice held high in the air "
            "on the cake server, with the source cake (matching wedge gap "
            "along the original pre-cut line) behind it on the plate."
        ),
        "video_template": (
            "[Scene]\n"
            "A complete whole round cake sits on a clean white round ceramic "
            "plate. The cake has one wedge pre-cut on top, seated flush with "
            "the rest of the cake. A stainless steel cake server enters from "
            "the lower-right side of the frame, slides cleanly under the "
            "pre-cut wedge along the existing cut line, and lifts that single "
            "slice high up and away from the cake, revealing a clean "
            "wedge-shaped empty gap in the source cake.\n\n"

            "[Motion]\n"
            "The cake server moves in from the lower-right corner with "
            "smooth, deliberate intent. As it slides under the pre-cut "
            "wedge, the slice separates cleanly from the cake along the "
            "pre-existing cut line — no crumbling, no sticking, no new "
            "tearing. The slice is then lifted vertically upward, rising "
            "high above the plate until the bottom of the slice reaches "
            "roughly the same height as the top surface of the remaining "
            "cake. As it rises, the slice tilts gently forward toward the "
            "camera: the outer wide curved edge of the wedge lifts slightly "
            "higher than the pointed tip, naturally presenting both cut "
            "faces of the slice to the camera.\n\n"

            "[Pacing]\n"
            "A single continuous shot, 8 seconds total.\n"
            "- 0.0s – 2.5s: cake server enters smoothly from the lower-right "
            "corner and slides under the pre-cut wedge along the existing "
            "cut line\n"
            "- 2.5s – 5.5s: the slice lifts slowly and steadily upward, "
            "tilting forward into its final pose with the wide curved end "
            "up and the pointed tip down\n"
            "- 5.5s – 8.0s: the slice is held steady in mid-air at its "
            "highest point, both cut faces fully and cleanly visible to "
            "the camera, the server stable — a polished hold for the final "
            "reveal\n\n"

            "[Camera]\n"
            "Locked-off camera. Slightly low eye-level, gently tilted "
            "downward toward the cake. No pan, no zoom, no dolly — the "
            "camera stays absolutely still throughout the entire shot. "
            "Only the cake server and the slice move.\n\n"

            "[Lighting]\n"
            "Soft, even studio lighting from the upper-left, casting a "
            "gentle natural shadow to the lower-right. Lighting stays "
            "constant throughout — no flicker, no shifts. The lifted slice "
            "catches a soft highlight on its top surface as it rises.\n\n"

            "[Style]\n"
            "Photorealistic, high-end commercial food photography in "
            "motion. Crisp focus on the slice and server, with the "
            "remaining cake softly in focus. Fine detail on the cake's "
            "surface texture and the internal cross-section visible on "
            "the cut faces.\n\n"

            "[Mood and Sound]\n"
            "Calm, refined, premium dessert advertisement atmosphere. No "
            "background music. Subtle natural sound design only: the faint "
            "soft contact of the steel server meeting the cake, the quiet "
            "clean separation of the slice from the rest of the cake, "
            "gentle ambient room tone. No voice, no narration.\n\n"

            "[Constraints]\n"
            "- No hands, no human figures, no additional utensils (no "
            "fork, no knife) anywhere in the frame\n"
            "- The remaining cake stays completely still on the plate; "
            "only the lifted slice and the cake server move\n"
            "- The remaining cake's shape, size, position, and surface "
            "must NOT change during the shot, except for the wedge-shaped "
            "gap appearing exactly where the pre-cut wedge was located\n"
            "- The pre-cut line in the starting frame is the ONLY "
            "separation line — no new cuts or lines appear elsewhere on "
            "the cake\n"
            "- The slice's design (surface texture, internal cross-section) "
            "remains consistent throughout the shot — no morphing, no "
            "shape changes, no color shifts\n"
            "- No camera movement of any kind"
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "hand_split": {
        "label_kr": "손으로 반 가르기",
        "category": "cream",   # 가르며 단면의 크림을 노출 — cream 역할 강조
        # 양손(검은 장갑)이 홀케이크를 잡고 있다가 반으로 깔끔하게 가름.
        # whipped/ganache/mascarpone/baked_cheese 는 모두 ductile 아니므로 stretching
        # 없이 깨끗한 단절. molten_chocolate 은 stretching 시그니처라 디자인 충돌 → 제외.
        # 2단계 I2I 체인 (cream_scoop / lift_slice 와 동일 패턴):
        #   start_frame_template — input 케이크를 양손이 들고 있는 첫 프레임
        #   instruction_template — 그 양손이 케이크를 가른 마지막 프레임
        "applicable_focus": [
            "whipped_cream", "ganache", "mascarpone_cream", "baked_cheese",
        ],
        "frame_strategy": "i2i_is_end",
        # 1단계 — input 케이크 → 양손이 케이크를 들고 있는 첫 프레임
        # 케이크-specific 색/표면/사이즈는 input 이미지가 시각 정보 제공 (보존).
        # prompt 는 "양손이 어떻게 잡고 있는지" 구조/동작에만 집중.
        "start_frame_template": (
            "Transform the cake in the input image into a complete whole "
            "round cake, held up in the air between two hands. The whole "
            "cake preserves the exact visual identity of the input: the "
            "cake's actual top surface as shown in the input image, the "
            "cake's actual body color and texture as shown in the input, "
            "same texture and density. The cake is a short cylinder, "
            "approximately matching the proportions and thickness of the "
            "input cake.\n\n"

            "How the cake is held: Two hands wearing matte black nitrile "
            "gloves cup and cradle the cake from both sides, holding it up "
            "vertically in the air like presenting a large coin to the "
            "camera. Each hand grips the cylindrical edge of the cake by "
            "pinching its thickness: the four fingers (index, middle, ring, "
            "pinky) wrap around to the back side of the cake (hidden from "
            "camera), while the thumb presses against the front face but "
            "only at the very outer rim of the side — the thumb pad rests "
            "on the cylindrical edge itself, providing inward support "
            "pressure, NOT laying flat on top of the front face. Both hands "
            "and forearms enter the frame from the BOTTOM edge of the "
            "image, rising upward to grip the cake from its left and right "
            "sides. The wrists and forearms extend downward out of the "
            "bottom of the frame, not sideways. The arms come up from "
            "below like someone is holding the cake up to show the "
            "camera.\n\n"

            "What the camera sees: The flat top face of the cake directly "
            "faces the camera, filling about 75% of the frame as a large "
            "centered circle. The cake's cylindrical body (its thickness) "
            "is only visible as a thin cake-body rim around the "
            "circumference of the top face. The camera is perpendicular to "
            "this top face — not looking down at the cake from above, not "
            "looking up from below, but straight on at eye level with the "
            "face of the cake.\n\n"

            "Plain dark neutral background, out of focus. No table or "
            "surface visible. Soft directional lighting from the front, "
            "highlighting the natural texture of the cake's top surface. "
            "Photorealistic, high-end food photography style."
        ),
        "slot_phrases": {
            "instruction": {
                "base":    "; the {value} body of the slice breaks cleanly along the split, exposing the layered baked structure on both halves",
                "topping": ". Any {value} on top of the slice stays attached to one of the two halves and may shift slightly with the pulling motion",
            },
            "video": {
                "base":    "; the {value} layers part cleanly along the break",
            },
        },
        "instruction_template": (
            "Edit the input image for a 9:16 vertical short-form video end frame, "
            "showing the cake slice now split into two halves by two human hands "
            "wearing black food-safe nitrile gloves.\n\n"
            "Both gloved hands grip the slice from its two pointed ends — the left "
            "hand from the left tip, the right hand from the right tip — with "
            "fingers wrapped around the bottom and sides of each half for a secure "
            "grip. The hands have just pulled the two halves apart, leaving a clear "
            "gap of roughly 4 to 6 centimeters of empty air between the freshly "
            "exposed inner faces.\n\n"
            "Each half retains its original triangular shape on the outside, with "
            "all external surfaces (top, sides, bottom) intact. The break runs "
            "cleanly down the middle of the slice, perpendicular to its long edge, "
            "revealing two flat inner cross-sections that face each other across "
            "the gap.\n\n"
            "The {focus} is clearly visible and emphasized as the most prominent "
            "feature on both freshly exposed inner faces{base}{topping}{interior_structure}{texture}. The break "
            "is sharp and clean — no stretching strands, no stringing, no dripping "
            "material connecting the two halves through the gap. The space between "
            "the halves is empty air.\n\n"
            "Preserve the cake's pixel-level appearance otherwise: same toppings on "
            "the surface, same cream pattern on external surfaces, same colors. "
            "The plate stays in place below. Background, lighting, and camera "
            "framing remain identical to the input.\n\n"
            "Photorealistic dessert close-up aesthetic, shallow depth of field "
            "focused on the exposed inner cross-sections."
        ),
        "video_template": (
            "Two black-gloved hands enter from the left and right edges of the "
            "frame, grip the slice firmly from both pointed ends, and in a single "
            "smooth, continuous motion pull the slice apart toward the edges of "
            "the frame. The slice splits cleanly down the middle, the two halves "
            "separating into the air with a clear gap opening between them, "
            "revealing two flat inner cross-sections that face each other — the "
            "{focus} is emphasized as the dominant feature on both exposed faces"
            "{base}{interior_structure}{texture}. The break stays clean throughout the motion, with no "
            "stretching strands or stringing across the gap. Static camera, "
            "smooth steady motion, ASMR-style food cinematography."
        ),
    },
    # ─────────────────────────────────────────────────────────────────
    "topping_fall": {
        "label_kr": "위에서 떨어뜨리기",
        "category": "topping",   # 토핑이 위에서 떨어져 안착 — 카테고리 자동 focus 는 topping 역할
        # 기존 strawberry_fall + strawberry_cascade 의 통합본 (S14P31S307-624).
        # 분석에서 추출된 어떤 topping 이든 자동 적용. 한 알이 톡 떨어지는 단일
        # 안착부터 우수수 쏟아지는 다량 안착까지 영상 모델이 컨텍스트에 맞게
        # 자연스럽게 해석하도록 양쪽을 모두 허용하는 phrasing.
        "applicable_focus": ["strawberry", "blueberry", "mango"],
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
            "Fresh {focus} pieces fall gently from above the frame onto the cake's top "
            "surface. The fall may be a single piece settling alone or several pieces "
            "cascading down in sequence — in either case, each piece tumbles through "
            "the air, lands on the surface with subtle deformation on impact, bounces "
            "softly, and settles into a final resting position. Small water droplets "
            "glisten on the natural surface of the {focus}, emphasized as the most "
            "prominent visual element in the scene. Static camera, soft diffused studio "
            "lighting, shallow depth of field, premium food commercial aesthetic, "
            "hyper-realistic textures."
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
# 카테고리 ↔ 역할 ↔ 기본 focus 매핑 (자동 focus 결정용)
# =====================================================================
# 시뮬레이션의 category 필드가 [시트/크림/토핑] 중 하나면, 사장님이 focus 를
# 명시 안 해도 analysis 의 해당 역할(base/cream/topping) 첫 요소를 자동으로
# focus 로 사용. analysis 가 없거나 역할이 비어 있으면 카테고리 기본값 사용.
#
# 이렇게 하면 사장님은 "케이크 시트 강조 시뮬" 만 고르면 되고, 어떤 시트인지
# (스펀지/바스크/시폰...) 는 시스템이 분석 결과에서 자동 결정함.
CATEGORY_TO_ROLE = {
    "sheet":   "base",     # 시트류 → analysis.base
    "cream":   "cream",    # 크림류 → analysis.creams
    "topping": "topping",  # 토핑류 → analysis.toppings
}

# 카테고리별 기본 focus — analysis 없거나 역할 비었을 때 폴백.
# 카테고리 별 대표 재료(가장 흔한 케이크 유형 기준).
CATEGORY_DEFAULT_FOCUS = {
    "sheet":   "sponge",
    "cream":   "whipped_cream",
    "topping": "strawberry",
}


# =====================================================================
# Phrase-level Optional Slot — 템플릿 슬롯({base}/{cream}/{topping}) 인프라
# =====================================================================
# 시뮬레이션 액션 묘사가 케이크의 실제 구성요소를 자연스럽게 참조할 수 있도록,
# 템플릿이 다음 placeholder 를 받음:
#   {focus}    — 기존 동작 (시뮬레이션 강조 요소)
#   {base}     — analysis.base 첫 요소 phrase 로 wrapping. 없으면 "" (구문 통째 omit)
#   {cream}    — analysis.creams 첫 요소 phrase 로 wrapping. 없으면 "" (구문 통째 omit)
#   {topping}  — analysis.toppings 첫 요소 phrase 로 wrapping. 없으면 "" (구문 통째 omit)
#
# 시뮬레이션이 슬롯을 쓰려면 `slot_phrases` 를 정의:
#   "slot_phrases": {
#       "instruction": {
#           "base":    " through the {value}",            # 케이크에 base 있을 때만 박힘
#           "cream":   ", squishing the {value} sideways",
#           "topping": " while the {value} stays in place",
#       },
#       "video": { ... }  # 동영상 묘사용 별도 wrapper
#   }
# 그러면 템플릿에서 "...the fork presses{cream}{topping}..." 식으로 비워둘 위치에
# placeholder 만 적으면 — 분석에 cream 없으면 그 phrase 통째 빠짐.
#
# 슬롯 미정의 시뮬은 기존 동작 유지: format_map 이 SafeDict 로 모든 빈 슬롯을 ""
# 로 치환하므로 기존 {focus}-only 템플릿은 그대로 작동.


class _SafeDict(dict):
    """`.format_map()` 헬퍼 — 누락 키는 빈 문자열. 슬롯 미사용 템플릿도 안전."""

    def __missing__(self, key: str) -> str:
        return ""


# =====================================================================
# 인라인 마커 — {?slot: phrase ... {slot} ... } 패턴 처리
# =====================================================================
# 사용자가 instruction_template 한 곳에서 옵셔널 phrase 를 직관적으로 표현할 수
# 있도록 하는 syntax. 별도 slot_phrases dict 정의 없이 템플릿 안에 직접 박을 수 있음.
#
# 동작:
#   "the fork presses{?cream: through the {cream}}, squishing"
#   - analysis 에 cream 있으면 → "the fork presses through the whipped cream, squishing"
#   - analysis 에 cream 없으면 → "the fork presses, squishing"   (블록 통째 빠짐)
#
# 슬롯 종류: ?base / ?cream / ?topping
#   - 분석 결과 (analysis.base[0], analysis.creams[0], analysis.toppings[0]) 첫 요소를
#     focus_phrase() 로 자연어 변환해서 사용.
#   - 마커 블록 내부의 {base} / {cream} / {topping} 도 같은 자연어 값으로 치환.
#
# 공백/콤마 자동 정리:
#   - 마커 블록 제거 시 주변에 남는 어색한 공백·콤마·이중공백 자동 trim.
#   - 사용자가 마커 안 공백/콤마 위치 신경 안 써도 됨.
#
# 안전성:
#   - 마커가 없는 템플릿엔 영향 0 (regex match 안 되면 통과).
#   - 마커 처리는 format_map() 직전 단계 — 응답에 노출되는 prompt 는 항상 클린한
#     영어 (raw 마커 syntax 노출 위험 없음).
import re as _re

_MARKER_PATTERN = _re.compile(
    r'\{\?(\w+):((?:[^{}]|\{[^{}]*\})*)\}'
)


def _build_marker_values(analysis: Optional[dict]) -> dict[str, str]:
    """analysis → 인라인 마커용 단순 단어 값 dict {base, cream, topping}.

    각 값은 focus_phrase() 통과시켜 자연어로 변환된 단어 ("whipped cream" 등).
    해당 요소가 분석에 없으면 키 자체가 빈 문자열 → 마커 블록 통째 omit.
    """
    if analysis is None:
        return {}
    import prompt_locks
    by_role = prompt_locks.collect_elements_by_role(analysis)
    values: dict[str, str] = {}
    for slot_key in ("base", "cream", "topping"):
        elements = by_role.get(slot_key, [])
        if elements:
            values[slot_key] = focus_phrase(elements[0])
    return values


def _process_inline_markers(template: str, marker_values: dict[str, str]) -> str:
    """{?slot: ... {slot} ... } 마커 처리 + 주변 공백/콤마 정리.

    - 슬롯 값이 비어있으면 블록 통째 제거
    - 차있으면 블록 내용을 펼치고 안의 {slot} 자리에 값 치환
    - 마커 블록 내부의 다른 placeholder (예: {focus}) 는 그대로 유지 → 이후
      format_map() 단계에서 채워짐.

    이 함수는 마커 syntax 만 처리하고, 기존 wrapping 슬롯 ({base}/{cream}/{topping}
    via slot_phrases) 이나 {focus} 등은 손대지 않음.
    """
    def replace(match: _re.Match) -> str:
        slot = match.group(1)
        body = match.group(2)
        value = marker_values.get(slot, "")
        if not value:
            return ""  # 블록 통째 제거
        # 블록 안의 {slot} 단순 치환 (e.g. "{cream}" → "whipped cream")
        return body.replace(f"{{{slot}}}", value)

    result = _MARKER_PATTERN.sub(replace, template)

    # 공백/콤마 자동 정리 — 마커 블록 제거 후 주변 잔여 정리
    result = _re.sub(r'\s+,', ',', result)      # " ," → ","
    result = _re.sub(r',\s*,', ',', result)      # ",," → ","
    result = _re.sub(r'\s+\.', '.', result)      # " ." → "."
    result = _re.sub(r'\s+;', ';', result)       # " ;" → ";"
    result = _re.sub(r'[ \t]{2,}', ' ', result)  # 더블 공백 → 단일 (개행은 유지)
    return result


def _resolve_slot_phrases(
    sim: dict,
    analysis: Optional[dict],
    template_kind: str,
    focus_key: Optional[str] = None,
    simulation_id: Optional[str] = None,
) -> dict[str, str]:
    """
    시뮬의 slot_phrases[template_kind] 정의 + analysis → {base, cream, topping} 의
    최종 치환 문자열 dict. 슬롯에 매칭되는 요소가 없거나 wrapper 미정의면 "".

    Args:
        sim:           SIMULATIONS[key] 의 dict
        analysis:      Moondream/Gemini Vision 분석 결과 (None 이면 모든 슬롯 "")
        template_kind: "instruction" or "video" — instruction/video 별 wrapper 사용
        focus_key:     이미 정해진 focus 키 (선택). 슬롯이 focus 와 동일한 요소를
                       가리키면 중복 묘사 방지 위해 해당 슬롯은 빈 문자열로.
                       (예: Basque 처럼 base 만 있는 단일층 케이크에서 cream 카테고리
                       시뮬을 돌리면 focus 가 base 역할의 요소를 fallback 으로 잡는데,
                       그러면 base 슬롯과 focus 가 같은 재료를 가리켜 중복됨.)

    Returns:
        {"base": "...", "cream": "...", "topping": "..."} — 각 값은 최종 phrase 또는 "".
    """
    result = {"base": "", "cream": "", "topping": "", "interior_structure": "", "texture": ""}
    if analysis is None:
        return result

    import prompt_locks
    by_role = prompt_locks.collect_elements_by_role(analysis)

    # role 기반 슬롯 (base/cream/topping) — 시뮬의 slot_phrases 정의 필요
    phrases_def = sim.get("slot_phrases", {}).get(template_kind, {})
    if phrases_def:
        for slot_key in ("base", "cream", "topping"):
            wrapper = phrases_def.get(slot_key)
            if not wrapper:
                continue
            elements = by_role.get(slot_key, [])
            if not elements:
                continue
            # 슬롯의 첫 요소가 focus 와 동일하면 중복 방지 — slot 비움
            canon = normalize_focus(elements[0])
            if focus_key and canon == focus_key:
                continue
            value = focus_phrase(elements[0])  # 짧은 영어 라벨
            result[slot_key] = wrapper.format(value=value)

    # 시스템 신호 슬롯 (interior_structure) — analysis.is_layered 직결, 시뮬별
    # wrapper 정의 불필요. 단면 노출 시뮬 템플릿이 {interior_structure} placeholder
    # 박은 곳에만 등장하며, 다른 시뮬엔 placeholder 없어서 자동으로 무시됨.
    is_layered = analysis.get("is_layered")
    if is_layered is True:
        if template_kind == "instruction":
            result["interior_structure"] = (
                ". The exposed cross-section reads as a multi-layered baked "
                "structure with distinct internal bands"
            )
        else:  # video
            result["interior_structure"] = (
                ". The exposed cross-section reveals a multi-layered baked "
                "structure with distinct internal bands"
            )
    elif is_layered is False:
        if template_kind == "instruction":
            result["interior_structure"] = (
                ". The exposed cross-section reads as a dense uniform interior "
                "body without separate layers"
            )
        else:  # video
            result["interior_structure"] = (
                ". The exposed cross-section reveals a dense uniform interior "
                "body without separate layers"
            )
    # None/누락 — 빈 문자열 유지 (placeholder 위치도 통째 omit)

    # texture 슬롯 — 두 레이어 결합:
    #   (1) baseline:  TEXTURE_PROFILES[focus][{action_type}_en] — 재료 정체성에
    #                  기반한 불변 물리 규칙 (예: "크림치즈는 모짜렐라처럼 안 늘어남").
    #                  코드에 하드코딩, 어떤 사진이든 그대로.
    #   (2) modifier:  analysis.element_textures[focus] — Gemini Vision 이 이 사진
    #                  의 인스턴스별 특색을 1줄로 묘사 (예: "softly oozing creamy
    #                  interior" vs "firm dense fudgy interior"). 케이크 종류 enum
    #                  없이도 사장님별·사진별 차이를 살림.
    # 둘 다 있으면 ". {baseline}. {modifier}." 로 박힘. 한쪽만 있어도 그것만 박힘.
    # 둘 다 없으면(action_type None 인 topping_fall 등) texture 빈 문자열.
    if simulation_id and focus_key:
        action_type = prompt_locks.SIMULATION_ACTION_TYPE.get(simulation_id)
        baseline = ""
        if action_type:
            texture_field = f"{action_type}_en"
            focus_profile = prompt_locks.TEXTURE_PROFILES.get(focus_key, {})
            baseline = focus_profile.get(texture_field, "").strip().rstrip(".")

        # Vision modifier — 분석 결과에 element_textures.focus 가 있으면 사용
        element_textures = analysis.get("element_textures") or {}
        modifier = (element_textures.get(focus_key) or "").strip().rstrip(".")

        # 두 레이어 결합 — 둘 다 / baseline 만 / modifier 만 / 없음
        if baseline and modifier:
            result["texture"] = f". {baseline}. {modifier}"
        elif baseline:
            result["texture"] = f". {baseline}"
        elif modifier:
            # baseline 없어도 (예: focus 가 TEXTURE_PROFILES 미정의) modifier 는 박음
            result["texture"] = f". {modifier}"
    return result


def derive_focus_from_category(
    simulation: str,
    analysis: Optional[dict] = None,
) -> Optional[str]:
    """
    시뮬레이션의 category 기반으로 focus 를 자동 결정.

    조회 우선순위:
      1) analysis 의 해당 역할 첫 요소 (이미 ELEMENT_ALIASES 로 정규화되어 있음)
         — 단, applicable_focus 에 포함된 경우만. 아니면 다음 단계로.
      2) applicable_focus 의 첫 요소 (시뮬이 받을 수 있는 가장 일반적인 focus)
      3) CATEGORY_DEFAULT_FOCUS 의 카테고리 기본값
      4) None (시뮬이 카테고리 없거나 알 수 없음)

    Args:
        simulation: SIMULATIONS 의 키
        analysis:   Moondream/Gemini Vision 분석 결과 dict (선택)

    Returns:
        정식 focus 키 (FOCUS_TEXT 의 키) 또는 None.
    """
    sim = SIMULATIONS.get(simulation)
    if not sim:
        return None
    category = sim.get("category")
    if not category:
        return None

    applicable = sim.get("applicable_focus", [])
    primary_role = CATEGORY_TO_ROLE.get(category)

    if analysis is not None:
        import prompt_locks
        by_role = prompt_locks.collect_elements_by_role(analysis)

        # 1) 카테고리의 주 역할에서 첫 applicable 요소 시도
        if primary_role:
            for elem in by_role.get(primary_role, []):
                canon = normalize_focus(elem)
                if canon in applicable:
                    return canon

        # 2) 다른 역할 폴백 — 주 역할이 비어 있어도(예: 바스크는 cream 비어 있음)
        #    실제 케이크에 있는 요소를 우선. applicable_focus 순서대로 시도.
        for role_key in ("base", "cream", "topping", "coating"):
            if role_key == primary_role:
                continue
            for elem in by_role.get(role_key, []):
                canon = normalize_focus(elem)
                if canon in applicable:
                    return canon

    # 3) applicable_focus 첫 요소 폴백 (analysis 자체 없음)
    if applicable:
        return applicable[0]

    # 4) 카테고리 기본값
    return CATEGORY_DEFAULT_FOCUS.get(category)


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


def build_background_prompt(background_key: str) -> str:
    """배경 교체용 I2I 지시문 생성. 배경 묘사는 prompt_locks.MOOD_LIGHTING 사용."""
    import prompt_locks
    bg_text = prompt_locks.get_mood_lighting(background_key)
    if not bg_text:
        raise ValueError(
            f"알 수 없는 background: {background_key}. "
            f"가능한 값: {list(prompt_locks.MOOD_LIGHTING.keys())}"
        )
    return BACKGROUND_INSTRUCTION_TEMPLATE.format(bg_text=bg_text)


# =====================================================================
# 핵심 빌더 함수
# =====================================================================
def build_prompts(
    simulation: str,
    focus: Optional[str] = None,
    background: Optional[str] = None,
    hint: Optional[str] = None,
    analysis: Optional[dict] = None,
) -> dict:
    """
    Args:
        simulation: SIMULATIONS의 키 ("smash", "fork_bite", "cut_in_half", ...)
        focus:      강조할 요소 키 (예: "strawberry", "whipped_cream", "sponge_layers").
                    None 이면 시뮬의 category 와 analysis 에서 자동 도출:
                      - [시트] 시뮬 → analysis.base 첫 요소
                      - [크림] 시뮬 → analysis.creams 첫 요소
                      - [토핑] 시뮬 → analysis.toppings 첫 요소
                    analysis 도 없으면 카테고리 기본값(sponge/whipped_cream/strawberry).
        background: 배경 키워드 (예: "wooden table", "white marble") — 선택
        hint:       사용자 자유 추가 힌트 — 선택
        analysis:   Moondream 분석 결과 dict — 있으면 instruction_prompt 앞에
                    visual identity 가이드("Materials visible in this cake: ...")가
                    자동 prepend 되어 nano-banana 가 입력 이미지의 재료를 정확히
                    인식하도록 도움. 없으면 가이드 생략(backward compatible).

    Returns:
        {
            "instruction_prompt":   str,    # nano-banana-pro/edit용 (last frame)
            "video_prompt":         str,    # Veo 3.1용
            "start_frame_prompt":   Optional[str],  # 시뮬에 start_frame_template 가
                                                    # 정의된 경우만 (예: cream_scoop).
                                                    # 별도 nano-banana 호출로 첫 프레임
                                                    # 을 생성하는 데 사용. None 이면
                                                    # 기존 동작 (배경 교체본 또는 원본이
                                                    # 첫 프레임).
            "frame_strategy":       str,    # "i2i_is_end" or "i2i_is_start"
            "system_prompt":        str,    # nano-banana-pro/edit의 system_prompt용
            "label_kr":             str,    # UI 표시용 한국어 라벨
        }
    """
    if simulation not in SIMULATIONS:
        raise ValueError(
            f"알 수 없는 simulation: {simulation}. "
            f"가능한 값: {list(SIMULATIONS.keys())}"
        )

    # focus 결정: 명시 우선 → category 자동 도출 → 에러
    if focus is None:
        focus = derive_focus_from_category(simulation, analysis)
        if focus is None:
            raise ValueError(
                f"focus 가 None 이고 simulation '{simulation}' 에 category 가 없어 "
                f"자동 도출 불가. focus 를 명시하거나 simulation 에 category 를 정의할 것."
            )

    # focus 정규화 (별칭이면 정식 키로). 검증은 호출자(API 레이어)가 담당.
    focus = normalize_focus(focus)
    sim = SIMULATIONS[simulation]
    focus_text = focus_phrase(focus)

    # 슬롯 phrase 해결 — 시뮬에 slot_phrases 정의 + analysis 있을 때만 채워짐.
    # 미정의/미해당 슬롯은 빈 문자열이라 템플릿의 {base}{cream}{topping} 자리는 사라짐.
    # focus 와 동일 요소를 가리키는 슬롯은 중복 묘사 방지를 위해 비움.
    # simulation_id 는 {texture} 슬롯 결정용 (SIMULATION_ACTION_TYPE 조회).
    slot_inst = _resolve_slot_phrases(sim, analysis, "instruction", focus_key=focus, simulation_id=simulation)
    slot_vid = _resolve_slot_phrases(sim, analysis, "video", focus_key=focus, simulation_id=simulation)
    fmt_inst = _SafeDict(focus=focus_text, **slot_inst)
    fmt_vid = _SafeDict(focus=focus_text, **slot_vid)

    # 인라인 마커 ({?base|cream|topping:...}) 처리 — format_map 직전 단계.
    # 마커 없는 템플릿엔 영향 0. 마커 있으면 그 블록을 펼치거나 통째 제거.
    marker_values = _build_marker_values(analysis)

    instruction = _process_inline_markers(sim["instruction_template"], marker_values).format_map(fmt_inst)
    video = _process_inline_markers(sim["video_template"], marker_values).format_map(fmt_vid)
    start_frame = None
    if sim.get("start_frame_template"):
        # start_frame 도 instruction 과 동일 wrapper 사용 (별도 슬롯 필요 시 향후 분리)
        start_frame = _process_inline_markers(sim["start_frame_template"], marker_values).format_map(fmt_inst)

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
            if start_frame is not None:
                start_frame = f"{structure_ctx}\n\n{start_frame}"

        # 시그니처 비주얼 라인 — analysis.key_feature 가 있을 때만 한 줄 박힘.
        # I2I 키프레임 + I2V 영상 모두에 prepend (영상은 키프레임에 그려진 시그니처를
        # 그대로 살려야 하므로 양쪽에 동일 신호 필요).
        signature = prompt_locks.get_signature_feature_en(analysis)
        if signature:
            instruction = f"{signature}\n\n{instruction}"
            if start_frame is not None:
                start_frame = f"{signature}\n\n{start_frame}"
            video = f"{signature}\n\n{video}"

        # 온도 hint — analysis.is_warm 이 True 일 때만 발화 (라바/몰튼 케이크 등).
        # I2I 에는 키프레임에 그려질 steam/glossy melt 단서, I2V 에는 viscous flow 단서.
        temperature_note = prompt_locks.get_temperature_note_en(analysis)
        if temperature_note:
            instruction = f"{temperature_note}\n\n{instruction}"
            if start_frame is not None:
                start_frame = f"{temperature_note}\n\n{start_frame}"
            video = f"{temperature_note}\n\n{video}"

    # 배경/힌트가 있으면 프롬프트 끝에 덧붙임.
    # 배경은 prompt_locks.MOOD_LIGHTING의 자연어 묘사로 변환 (raw 키 박지 않음).
    # 단 start_frame_prompt 는 이미 "Preserve the exact same background" 같이 자체
    # 완결된 지시문이라 extras 덧붙이지 않음 — bg 는 별도 bg-swap I2I 단계에서 처리.
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
        "start_frame_prompt": start_frame,
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
