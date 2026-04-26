from fastapi import APIRouter, Form

from app.schemas.watermark import WatermarkEmbedResponse
from app.services.watermark_service import embed_watermark

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
