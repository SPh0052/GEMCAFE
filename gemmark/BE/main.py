"""
gemmark Backend — FastAPI 진입점

실행:
    uvicorn main:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.db import AsyncSessionLocal, engine
from app.core.exceptions import VideoUploadError
from app.core.redis import close_redis
from app.services.admin_service import ensure_default_admin

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    try:
        async with AsyncSessionLocal() as db:
            await ensure_default_admin(db)
            logger.info("DB 연결 + 초기 관리자 확인 완료")
    except Exception as e:
        logger.warning(f"DB 초기화 실패 (앱은 계속 기동): {e}")

    yield

    # ── Shutdown ──
    await engine.dispose()
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5174",
        "http://localhost:3000",
        "https://localhost:3000",
        "http://localhost:8000",
        "https://localhost:8000",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://127.0.0.1:5174",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://127.0.0.1:8000",
        "https://k14s307.p.ssafy.io",
        "http://k14s307.p.ssafy.io",
        "http://k14s307.p.ssafy.io:3003",
        "https://k14s307.p.ssafy.io:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)


@app.exception_handler(VideoUploadError)
async def custom_error_handler(request: Request, exc: VideoUploadError) -> JSONResponse:
    """`detail` 래퍼 없이 평면 구조로 에러 응답."""
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


app.include_router(api_router, prefix="/api")

# 워터마크된 영상 등 정적 파일 서빙 (/files/watermarked/{uuid}.mp4 등)
_files_root = settings.UPLOAD_DIR.parent
_files_root.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=_files_root), name="files")


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "env": settings.APP_ENV, "status": "ok"}
