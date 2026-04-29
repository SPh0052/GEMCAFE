from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.video import VideoListResponse, VideoUploadResponse
from app.services.video_service import list_watermarked_videos, upload_video

router = APIRouter(prefix="/videos", tags=["videos"])


@router.post(
    "/upload",
    response_model=VideoUploadResponse,
    summary="영상 파일 업로드",
)
async def upload_video_endpoint(
    videoName: UploadFile = File(default=None),
) -> VideoUploadResponse:
    data = await upload_video(videoName)
    return VideoUploadResponse(data=data)


@router.get(
    "",
    response_model=VideoListResponse,
    summary="워터마크 삽입 영상 목록 조회",
)
async def list_videos_endpoint(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> VideoListResponse:
    admin_id = int(token_payload["sub"])
    data = await list_watermarked_videos(db, admin_id, page, size)
    return VideoListResponse(data=data)
