from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.watermark import WatermarkEmbedResponse, WatermarkVerifyResponse
from app.services.watermark_service import embed_watermark, verify_watermark

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
    file: UploadFile = File(default=None),
) -> WatermarkVerifyResponse:
    data = await verify_watermark(file)
    return WatermarkVerifyResponse(data=data)
