"""
gemmark Backend — FastAPI 진입점

실행:
    uvicorn main:app --reload
"""

from fastapi import FastAPI

from app.core.config import settings
from app.api.routes import router as api_router

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "env": settings.APP_ENV, "status": "ok"}
