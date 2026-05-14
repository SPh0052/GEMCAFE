from fastapi import APIRouter

from app.api.v1 import auth, dashboard, robustness, verifications, videos, watermark

router = APIRouter(prefix="/v1")
router.include_router(auth.router)
router.include_router(videos.router)
router.include_router(watermark.router)
router.include_router(verifications.router)
router.include_router(robustness.router)
router.include_router(dashboard.router)
