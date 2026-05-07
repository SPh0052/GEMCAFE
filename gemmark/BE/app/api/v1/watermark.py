from fastapi import APIRouter, Depends, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
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
    alpha: int = Form(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> WatermarkEmbedResponse:
    admin_id = int(token_payload["sub"])
    data = await embed_watermark(db, admin_id, videoId, alpha=alpha)
    return WatermarkEmbedResponse(data=data)


@router.post(
    "/verify",
    response_model=WatermarkVerifyResponse,
    summary="워터마크 검증",
)
async def verify_watermark_endpoint(
    videoId: str = Form(default=None),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> WatermarkVerifyResponse:
    admin_id = int(token_payload["sub"])
    data = await verify_watermark(db, admin_id, videoId)
    return WatermarkVerifyResponse(data=data)


@router.get(
    "/{video_id}/download",
    response_class=FileResponse,
    summary="워터마크 영상 다운로드",
)
async def download_watermarked_endpoint(
    video_id: str,
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    return await download_watermarked_video(db, video_id)
