"""
FastAPI 래퍼 — BE(Spring)에서 HTTP로 호출할 AI 서비스.

엔드포인트:
  GET  /             — 정보 (Swagger UI 링크)
  GET  /health       — 헬스체크
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
    video_prompt: str = Field(..., description="영상 동작을 묘사하는 프롬프트")
    duration: str = Field("6s", description="'4s' / '6s' / '8s' 중 택1")
    resolution: str = Field("720p", description="'720p' / '1080p' / '4k'")
    generate_audio: bool = Field(False, description="음성 생성 여부")


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


@app.post("/analyze", tags=["pipeline"])
async def analyze_endpoint(
    image: UploadFile = File(..., description="분석할 케이크 이미지"),
) -> dict:
    """
    케이크 이미지 분석 (STEP 2).

    Moondream3가 케이크의 cake_type, creams, toppings, suggested_focus 등을
    JSON으로 추출. 프론트는 suggested_focus를 라디오 버튼/카드로 표시.
    """
    require_fal_key()
    image_path = save_upload(image)
    try:
        image_url = analyze_module.upload(image_path)
        analysis = analyze_module.analyze_with_moondream(
            image_url, analyze_module.ANALYSIS_PROMPT
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 실패: {e}")


@app.post("/keyframe", tags=["pipeline"])
async def keyframe_endpoint(
    image: UploadFile = File(..., description="원본 케이크 이미지"),
    simulation: str = Form(
        ...,
        description="시뮬레이션 종류: 'cross_section_cut' / 'lift_slice' / 'topping_fall'",
    ),
    focus: Optional[str] = Form(
        None,
        description="강조 요소 (예: 'strawberry'). 비우면 서버측 자동(latest analyze 기반).",
    ),
    background: Optional[str] = Form(
        None,
        description="배경: 'white_marble' / 'cafe_interior' / 'outdoor'. "
                    "비우면 배경 교체 안 함.",
    ),
    hint: Optional[str] = Form(None, description="자유 텍스트 힌트"),
    seed: Optional[int] = Form(
        None,
        description="재생성 시 다른 값으로 호출. 비우면 매번 랜덤.",
    ),
) -> dict:
    """
    키프레임 생성 (STEP 7-1).

    1회 호출 = 키프레임 1장. 재생성 시 같은 엔드포인트를 seed 다르게 다시 호출.
    응답의 모든 필드를 그대로 보관해야 다음 /video 호출에 사용 가능.
    """
    require_fal_key()
    image_path = save_upload(image)
    try:
        result = generate_keyframe.generate_keyframe(
            image_path=image_path,
            simulation=simulation,
            focus=focus,
            background=background,
            hint=hint,
            seed=seed,
        )
        return result
    except SystemExit as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"키프레임 생성 실패: {e}")


@app.post("/video", tags=["pipeline"])
async def video_endpoint(req: VideoRequest) -> dict:
    """
    영상 생성 (STEP 8).

    /keyframe 응답에서 받은 keyframe_url, base_url, frame_strategy, video_prompt 를
    조합해서 BE가 start_url/end_url을 결정한 뒤 호출.

    frame_strategy 처리 (BE에서):
      - "i2i_is_end"   → start_url = base_url,     end_url = keyframe_url
      - "i2i_is_start" → start_url = keyframe_url, end_url = base_url
    """
    require_fal_key()
    try:
        result = generate_video.generate_video(
            start_url=req.start_url,
            end_url=req.end_url,
            video_prompt=req.video_prompt,
            duration=req.duration,
            resolution=req.resolution,
            generate_audio=req.generate_audio,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"영상 생성 실패: {e}")
