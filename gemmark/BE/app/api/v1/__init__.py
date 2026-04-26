from fastapi import APIRouter

from app.api.v1 import videos

router = APIRouter(prefix="/v1")
router.include_router(videos.router)
