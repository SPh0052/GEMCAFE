from fastapi import APIRouter, Form
from fastapi.responses import FileResponse

from app.schemas.watermark import WatermarkEmbedResponse, WatermarkVerifyResponse
from app.services.watermark_service import (
    download_watermarked_video,
    embed_watermark,
    verify_watermark,
)

router = APIRouter(prefix="/watermark", tags=["watermark"])


@router.post(
    "/embed",
    response_model=WatermarkEmbedResponse,
    summary="워터마크 삽입",
)
async def embed_watermark_endpoint(
    videoId: str = Form(default=None),
) -> WatermarkEmbedResponse:
    data = await embed_watermark(videoId)
    return WatermarkEmbedResponse(data=data)


@router.post(
    "/verify",
    response_model=WatermarkVerifyResponse,
    summary="워터마크 검증",
)
async def verify_watermark_endpoint(
    videoId: str = Form(default=None),
) -> WatermarkVerifyResponse:
    data = await verify_watermark(videoId)
    return WatermarkVerifyResponse(data=data)


@router.get(
    "/{video_id}/download",
    response_class=FileResponse,
    summary="워터마크 영상 다운로드",
)
def download_watermarked_endpoint(video_id: str) -> FileResponse:
    return download_watermarked_video(video_id)
