from fastapi import APIRouter, File, UploadFile

from app.schemas.video import VideoUploadResponse
from app.services.video_service import upload_video

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
