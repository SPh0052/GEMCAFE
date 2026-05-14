"""
FastAPI 래퍼 — BE(Spring)에서 HTTP로 호출할 AI 서비스.

엔드포인트:
  GET  /             — 정보 (Swagger UI 링크)
  GET  /health       — 헬스체크
  GET  /catalog      — 시뮬레이션/배경/요소 카탈로그 (BE/FE 가 옵션 목록 조회)
  POST /analyze      — 케이크 이미지 분석 (Moondream3)
  POST /keyframe     — 키프레임 생성 (nano-banana-pro/edit, 재호출 가능)
  POST /video        — 영상 생성 (Veo 3.1 first-last-frame)

실행:
  pip install -r requirements.txt
  uvicorn api:app --reload --host 0.0.0.0 --port 8000

개발 도구:
  http://localhost:8000/docs     — Swagger UI (자동 생성)
  http://localhost:8000/redoc    — ReDoc UI

사용 흐름 (BE/FE):
  1. POST /analyze (image)
     → suggested_focus 후보 받아서 사용자에게 보여줌
  2. POST /keyframe (image, simulation, focus, background?, hint?, seed?)
     → 키프레임 1장 생성. 재생성 시 같은 호출 반복(seed 다르게).
  3. 사용자가 키프레임 후보 중 하나 선택
  4. POST /video (start_url, end_url, video_prompt) — 선택된 키프레임의 메타데이터로
     → 영상 생성
"""
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import analyze as analyze_module
import generate_keyframe
import generate_video
import prompt_builder
import prompt_locks

load_dotenv()

app = FastAPI(
    title="Gemcafe AI Service",
    description=(
        "케이크 이미지 → AI 영상 생성 파이프라인.\n\n"
        "Moondream3 (분석) → nano-banana-pro/edit (I2I 키프레임) → "
        "Veo 3.1 first-last-frame (I2V)"
    ),
    version="0.1.0",
)

# CORS — BE가 다른 origin에서도 호출 가능하게 (dev). 운영에선 BE 도메인으로 제한 권장.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"


# =====================================================================
# 응답/요청 스키마 (Pydantic — Swagger 문서 자동 생성용)
# =====================================================================
class HealthResponse(BaseModel):
    status: str
    fal_key_set: bool


class VideoRequest(BaseModel):
    start_url: str = Field(..., description="영상 시작 프레임 URL")
    end_url: str = Field(..., description="영상 끝 프레임 URL")
    video_prompt: Optional[str] = Field(
        None,
        description=(
            "영상 동작 묘사 (영어). "
            "video_prompt_kr 가 있으면 무시되고 LLM이 한국어를 영어로 변환함."
        ),
    )
    video_prompt_kr: Optional[str] = Field(
        None,
        description=(
            "사장님이 한국어로 작성/편집한 영상 묘사. "
            "지정 시 LLM(Gemini 2.5 Flash-Lite via GMS) 변환 후 잠금 라이브러리(카메라/기술/부정 프롬프트) 자동 결합."
        ),
    )
    simulation: Optional[str] = Field(
        None,
        description=(
            "video_prompt_kr 사용 시 필수. "
            "잠금 라이브러리에서 카메라/부정 프롬프트/길이 조회용. "
            "예: smash / fork_bite / cut_in_half / cream_scoop / "
            "strawberry_fall / strawberry_cascade. "
            "전체 목록은 GET /catalog."
        ),
    )
    background: Optional[str] = Field(
        None,
        description="video_prompt_kr 사용 시 배경 키 (white_marble, cafe_interior, outdoor 등). 미지정 시 배경 묘사 생략.",
    )
    model_id: str = Field(
        "veo-3.1",
        description="영상 모델 식별자 (잠금 라이브러리에서 모델별 키워드 조회). veo-3.1 / kling-3.0-pro 등.",
    )
    duration: Optional[str] = Field(
        None,
        description="None이면 시뮬레이션 권장값 자동. '4s'/'6s'/'8s' 중 택1.",
    )
    resolution: str = Field("720p", description="'720p' / '1080p' / '4k'")
    generate_audio: bool = Field(False, description="음성 생성 여부")


class PreviewPromptsRequest(BaseModel):
    simulation: str = Field(
        ...,
        description=(
            "시뮬레이션 키. 예: smash / fork_bite / cut_in_half / cream_scoop / "
            "strawberry_fall / strawberry_cascade. 전체 목록은 GET /catalog."
        ),
    )
    focus: str = Field(..., description="강조 요소 키 (sponge / strawberry / whipped_cream)")
    background: Optional[str] = Field(None, description="배경 키 (없으면 원본)")
    hint: Optional[str] = Field(None, description="자유 한국어 힌트 (예: '고급스럽게')")
    dessert_info: str = Field("케이크", description="디저트 종류 (분석 결과의 cake_type 등)")
    cake_elements: Optional[list] = Field(
        None,
        description=(
            "케이크 구성요소 키 리스트 (예: ['whipped_cream','sponge','strawberry']). "
            "있으면 LLM이 요소별 정확한 질감/반응 묘사 사용. "
            "없으면 일반적인 묘사만 생성."
        ),
    )
    analysis: Optional[dict] = Field(
        None,
        description=(
            "Moondream 분석 결과 dict. cake_elements가 비어있을 때 이걸로 자동 추출. "
            "(creams, toppings, base, coating 필드 사용)"
        ),
    )


# =====================================================================
# 헬퍼
# =====================================================================
def save_upload(file: UploadFile) -> str:
    """multipart 업로드 파일을 임시 디렉토리에 저장. 로컬 경로 반환."""
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    ext = Path(file.filename or "image.jpg").suffix or ".jpg"
    save_path = Path(UPLOAD_DIR) / f"upload_{ts}{ext}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return str(save_path)


def require_fal_key():
    if not os.environ.get("FAL_KEY"):
        raise HTTPException(
            status_code=500,
            detail="FAL_KEY 환경변수 미설정. 서버의 .env 파일 확인 필요.",
        )


# =====================================================================
# 엔드포인트
# =====================================================================
@app.get("/", include_in_schema=False)
def root():
    """루트 → Swagger UI 로 리다이렉트."""
    return RedirectResponse(url="/docs")


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health():
    """서비스 상태 확인. BE가 주기적으로 호출 가능."""
    return HealthResponse(
        status="ok",
        fal_key_set=bool(os.environ.get("FAL_KEY")),
    )


@app.get("/catalog", tags=["meta"])
def catalog() -> dict:
    """
    시뮬레이션 / 배경 / 요소(focus) 카탈로그.

    이 응답이 AI 서비스의 **단일 진실 소스(SSOT)** 입니다.
    BE/FE 는 이 응답을 받아서:
      - 요소(focus) 선택 시 그 요소의 applicable_simulations 만 노출
      - simulation_id ↔ AI 키 매핑 시 여기 정의된 key 를 사용

    `applicable_focus` 는 [prompt_builder.SIMULATIONS](prompt_builder.py) 가 단일 출처.
    """
    simulations = [
        {
            "key": sim_key,
            "label_kr": sim_def["label_kr"],
            "applicable_focus": list(sim_def["applicable_focus"]),
            "frame_strategy": sim_def["frame_strategy"],
            "recommended_duration": prompt_locks.get_duration(sim_key),
        }
        for sim_key, sim_def in prompt_builder.SIMULATIONS.items()
    ]

    backgrounds = [
        {"key": bg_key, "label_kr": label_kr}
        for bg_key, label_kr in prompt_locks.BACKGROUND_LABELS_KR.items()
    ]

    # 요소(focus) — 정식 키 + 한국어 라벨. 별칭은 호환용으로만 노출.
    focus_labels_kr = {
        "sponge":           "시트",
        "strawberry":       "딸기",
        "whipped_cream":    "생크림",
        "ganache":          "가나슈",
        "molten_chocolate": "흐르는 초콜릿",
        "mascarpone_cream": "마스카포네 크림",
        "baked_cheese":     "치즈 필링",
    }
    focuses = [
        {
            "key": focus_key,
            "label_kr": focus_labels_kr.get(focus_key, focus_key),
            "applicable_simulations": list(prompt_builder.FOCUS_SIMULATIONS.get(focus_key, [])),
        }
        for focus_key in prompt_builder.FOCUS_TEXT
    ]

    return {
        "simulations": simulations,
        "backgrounds": backgrounds,
        "focuses": focuses,
        "focus_aliases": dict(prompt_builder.FOCUS_ALIASES),
    }


@app.post("/analyze", tags=["pipeline"])
def analyze_endpoint(
    image: UploadFile = File(..., description="분석할 케이크 이미지"),
) -> dict:
    """
    케이크 이미지 분석 (STEP 2).

    Moondream3가 케이크의 cake_type, creams, toppings, suggested_focus 등을
    JSON으로 추출. 프론트는 suggested_focus를 라디오 버튼/카드로 표시.

    ⚠️ BE는 응답 dict를 보관해뒀다가 `/keyframe` 호출 시 `analysis_json` 으로 다시 전달해야 함
       (focus를 명시적으로 지정하지 않을 경우).
    """
    require_fal_key()
    image_path = save_upload(image)
    try:
        image_url = analyze_module.upload(image_path)
        # analyze_with_moondream 은 (parsed_dict, raw_text, response_info) 3-tuple 반환.
        # FastAPI 는 dict 만 받으므로 첫 번째 요소만 응답.
        analysis, _raw_text, _response_info = analyze_module.analyze_with_moondream(
            image_url, analyze_module.ANALYSIS_PROMPT
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 실패: {e}")


@app.post("/keyframe", tags=["pipeline"])
def keyframe_endpoint(
    image: UploadFile = File(..., description="원본 케이크 이미지"),
    simulation: str = Form(
        ...,
        description=(
            "시뮬레이션 키. 'smash' / 'fork_bite' / 'cut_in_half' / 'cream_scoop' / "
            "'strawberry_fall' / 'strawberry_cascade'. 전체 목록은 GET /catalog."
        ),
    ),
    focus: Optional[str] = Form(
        None,
        description="강조 요소 (예: 'strawberry'). 비우면 analysis_json 필수.",
    ),
    background: Optional[str] = Form(
        None,
        description="배경: 'white_marble' / 'cafe_interior' / 'outdoor' / "
                    "'wooden_table' / 'minimalist_white' / 'dark_moody'. "
                    "비우면 배경 교체 안 함.",
    ),
    hint: Optional[str] = Form(None, description="자유 텍스트 힌트"),
    seed: Optional[int] = Form(
        None,
        description="재생성 시 다른 값으로 호출. 비우면 매번 랜덤.",
    ),
    analysis_json: Optional[str] = Form(
        None,
        description=(
            "/analyze 응답 dict를 JSON 문자열로 직렬화해서 전달. "
            "focus가 None일 때 suggested_focus 자동 선택용. "
            "focus 명시하면 무시 가능. 멀티유저 안전성을 위해 명시 전달 권장."
        ),
    ),
    aspect_ratio: str = Form(
        "9:16",
        description=(
            "키프레임/영상 종횡비. 기본값 '9:16' (숏폼/YouTube Shorts/Reels/TikTok). "
            "다른 값: '16:9'(가로) / '1:1'(정사각형) / 'auto'(원본 비율). "
            "BE/FE 가 안 보내도 production 기본인 9:16 으로 동작. "
            "키프레임이 이 비율로 생성되면 Veo first-last-frame 영상도 같은 비율로 출력됨."
        ),
    ),
) -> dict:
    """
    키프레임 생성 (STEP 7-1).

    1회 호출 = 키프레임 1장. 재생성 시 같은 엔드포인트를 seed 다르게 다시 호출.
    응답의 모든 필드를 그대로 보관해야 다음 /video 호출에 사용 가능.

    멀티유저 환경에서는 BE가 `/analyze` 응답을 보관했다가 `analysis_json`으로 전달.
    """
    require_fal_key()
    image_path = save_upload(image)

    # analysis_json 파싱 (있으면)
    analysis_dict: Optional[dict] = None
    if analysis_json:
        try:
            analysis_dict = json.loads(analysis_json)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400, detail=f"analysis_json 파싱 실패: {e}"
            )

    # focus와 analysis 둘 다 없으면 400 (디스크 fallback 사용 X — 멀티유저 안전)
    if focus is None and analysis_dict is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "focus 또는 analysis_json 둘 중 하나는 반드시 지정 필요. "
                "BE는 /analyze 응답을 보관했다가 analysis_json으로 전달하세요."
            ),
        )

    # simulation 존재 여부 + (focus 명시된 경우) 조합 유효성 검증
    if simulation not in prompt_builder.SIMULATIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"알 수 없는 simulation '{simulation}'. "
                f"가능한 값: {list(prompt_builder.SIMULATIONS.keys())}. "
                "GET /catalog 로 정식 목록 조회 가능."
            ),
        )
    if focus is not None and not prompt_builder.is_valid_combination(focus, simulation):
        normalized = prompt_builder.normalize_focus(focus)
        allowed = prompt_builder.SIMULATIONS[simulation]["applicable_focus"]
        raise HTTPException(
            status_code=400,
            detail=(
                f"focus '{focus}'(정규화: '{normalized}')는 simulation '{simulation}' 에 "
                f"적용 불가. 이 시뮬레이션의 applicable_focus: {allowed}. "
                "GET /catalog 응답으로 FE 가 사전 필터링하길 권장."
            ),
        )

    try:
        result = generate_keyframe.generate_keyframe(
            image_path=image_path,
            simulation=simulation,
            focus=focus,
            background=background,
            hint=hint,
            seed=seed,
            analysis=analysis_dict,
            aspect_ratio=aspect_ratio,
        )
        return result
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"키프레임 생성 실패: {e}")


@app.post("/preview-prompts", tags=["pipeline"])
def preview_prompts_endpoint(req: PreviewPromptsRequest) -> dict:
    """
    오토 프롬프팅 Phase 1 — 슬롯 → 자연스러운 한국어 미리보기.

    Gemini 2.5 Flash-Lite (SSAFY GMS 경유) 가 사장님이 만들 영상의 모습을 한국어 2~3문장으로 묘사.
    이 결과를 화면에 띄워서 사장님이 편집 가능. 편집된 한국어를 /video의 video_prompt_kr 로 전달.

    AI 호출이지만 영상 생성은 안 하므로 비용은 거의 무시할 수준.
    """
    try:
        korean_preview = prompt_builder.build_korean_preview(
            simulation=req.simulation,
            focus=req.focus,
            background=req.background,
            hint=req.hint,
            dessert_info=req.dessert_info,
            cake_elements=req.cake_elements,
            analysis=req.analysis,
        )
        return {"korean_preview": korean_preview}
    except RuntimeError as e:
        # GMS_KEY 미설정 등
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"한국어 미리보기 생성 실패: {e}")


@app.post("/video", tags=["pipeline"])
def video_endpoint(req: VideoRequest) -> dict:
    """
    영상 생성 (STEP 8).

    두 가지 모드:
      A) video_prompt_kr 지정 → LLM이 한→영 변환 + 잠금 라이브러리 자동 결합
         (simulation 필수, background/model_id 권장)
      B) video_prompt 지정    → 영어 그대로 사용 (잠금 결합 없음, 직접 호출용)

    /keyframe 응답에서 받은 keyframe_url, base_url, frame_strategy 를
    조합해서 BE가 start_url/end_url을 결정한 뒤 호출:
      - "i2i_is_end"   → start_url = base_url,     end_url = keyframe_url
      - "i2i_is_start" → start_url = keyframe_url, end_url = base_url
    """
    require_fal_key()

    # 모드 분기 — Korean 우선
    if req.video_prompt_kr:
        if not req.simulation:
            raise HTTPException(
                status_code=400,
                detail="video_prompt_kr 사용 시 simulation 필수 (잠금 라이브러리 조회용).",
            )
        try:
            assembled = prompt_builder.assemble_final_video_prompt(
                user_korean_text=req.video_prompt_kr,
                simulation=req.simulation,
                background=req.background,
                model_id=req.model_id,
            )
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))
        final_prompt = assembled["prompt"]
        negative_prompt = assembled["negative_prompt"]
        duration = req.duration or assembled["duration"]
        debug_user_part = assembled["user_part_en"]
    elif req.video_prompt:
        final_prompt = req.video_prompt
        negative_prompt = "blur, distort, low quality, deformed, ugly"
        duration = req.duration or "6s"
        debug_user_part = None
    else:
        raise HTTPException(
            status_code=400,
            detail="video_prompt 또는 video_prompt_kr 둘 중 하나는 필수.",
        )

    try:
        result = generate_video.generate_video(
            start_url=req.start_url,
            end_url=req.end_url,
            video_prompt=final_prompt,
            duration=duration,
            resolution=req.resolution,
            generate_audio=req.generate_audio,
            negative_prompt=negative_prompt,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"영상 생성 실패: {e}")

    # 디버그용 — 무엇이 최종으로 나갔는지 응답에 포함
    result["final_prompt_used"] = final_prompt
    result["negative_prompt_used"] = negative_prompt
    if debug_user_part:
        result["llm_translated_user_part"] = debug_user_part
    return result
