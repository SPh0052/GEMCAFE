"""
gemmark Backend — FastAPI 진입점

실행:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.routes import router as api_router

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
)

app.include_router(api_router, prefix="/api")

# 워터마크된 영상 등 정적 파일 서빙 (/files/watermarked/{uuid}.mp4 등)
_files_root = settings.UPLOAD_DIR.parent
_files_root.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=_files_root), name="files")


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "env": settings.APP_ENV, "status": "ok"}
