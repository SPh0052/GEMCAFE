from fastapi import APIRouter, Depends, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.watermark import WatermarkEmbedResponse, WatermarkVerifyResponse
from app.services.watermark_service import (
    download_watermarked_video,
    embed_watermark,
    embed_watermark_external,
    verify_watermark,
)

router = APIRouter(prefix="/watermark", tags=["watermark"])


class WatermarkEmbedFromPathRequest(BaseModel):
    sourceFilePath: str = Field(..., description="gemmark 컨테이너에서 접근 가능한 원본 영상 절대 경로")
    downloaderUserId: str = Field(..., description="페이로드 인코딩용 식별자 (gemcafe userId 문자열)")
    alpha: int | None = Field(default=None, ge=1, le=100, description="워터마크 강도 (기본 설정값 사용)")


class WatermarkEmbedFromPathResponse(BaseModel):
    storedFileName: str
    fileSize: int
    durationSec: float
    watermarkHex: str
    processingTime: float | None = None


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
def download_watermarked_endpoint(video_id: str) -> FileResponse:
    return download_watermarked_video(video_id)


@router.post(
    "/embed-from-path",
    response_model=WatermarkEmbedFromPathResponse,
    summary="gemcafe→gemmark 내부 호출 전용 워터마크 삽입. 파일 경로 직접 전달, DB/등록부 skip.",
)
async def embed_watermark_from_path_endpoint(
    req: WatermarkEmbedFromPathRequest,
) -> WatermarkEmbedFromPathResponse:
    # gateway-net 내부 호출만 도달 가능. 인증 우회.
    data = await embed_watermark_external(
        source_file_path=req.sourceFilePath,
        downloader_user_id=req.downloaderUserId,
        alpha=req.alpha,
    )
    return WatermarkEmbedFromPathResponse(**data)
