"""
gemmark Backend — FastAPI 진입점

실행:
    uvicorn main:app --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.db import AsyncSessionLocal, engine
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


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router, prefix="/api")

# 워터마크된 영상 등 정적 파일 서빙 (/files/watermarked/{uuid}.mp4 등)
_files_root = settings.UPLOAD_DIR.parent
_files_root.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=_files_root), name="files")


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "env": settings.APP_ENV, "status": "ok"}
