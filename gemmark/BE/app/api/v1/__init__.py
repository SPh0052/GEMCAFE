from fastapi import APIRouter

from app.api.v1 import videos, watermark

router = APIRouter(prefix="/v1")
router.include_router(videos.router)
router.include_router(watermark.router)
