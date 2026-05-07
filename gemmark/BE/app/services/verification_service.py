"""워터마크 검증 이력 조회 서비스."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import WATERMARK_BUSINESS_ID
from app.core.exceptions import VerificationDetailNotFoundError
from app.models.verification import VerificationHistory
from app.models.video import VideoWatermarked
from app.schemas.verification import (
    VerificationDetailData,
    VerificationListData,
    VerificationListItem,
)
from app.services.watermark.payload import PAYLOAD_BITS


def _thumbnail_url(thumbnail_name: str | None) -> str | None:
    if not thumbnail_name:
        return None
    return f"/files/watermarked/{thumbnail_name}"


async def list_verifications(
    db: AsyncSession,
    admin_id: int,
    page: int,
    size: int,
) -> VerificationListData:
    """본인이 시도한 검증 이력 목록 (최신순). NOT_DETECTED(vw_id NULL) 행도 포함."""
    base = (
        select(VerificationHistory, VideoWatermarked)
        .outerjoin(
            VideoWatermarked,
            VerificationHistory.video_watermarked_id == VideoWatermarked.id,
        )
        .where(VerificationHistory.admin_id == admin_id)
    )

    total_result = await db.execute(
        select(func.count())
        .select_from(VerificationHistory)
        .where(VerificationHistory.admin_id == admin_id)
    )
    total = int(total_result.scalar_one())

    rows_result = await db.execute(
        base.order_by(VerificationHistory.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    rows = rows_result.all()

    items = [
        VerificationListItem(
            id=v.id,
            videoWatermarkedId=v.video_watermarked_id,
            status=_status_value(v.status),
            originalFileName=w.original_file_name if w is not None else "",
            fileSize=w.file_size if w is not None else 0,
            durationSec=w.duration_sec if w is not None else 0.0,
            thumbnailUrl=_thumbnail_url(w.thumbnail_name) if w is not None else None,
            createdAt=v.created_at,
        )
        for v, w in rows
    ]

    return VerificationListData(items=items, total=total, page=page, size=size)


def _status_value(status_obj) -> str:
    return status_obj.value if hasattr(status_obj, "value") else str(status_obj)


async def get_verification_detail(
    db: AsyncSession,
    admin_id: int,
    verification_id: int,
) -> VerificationDetailData:
    """본인 검증 이력 상세 조회 (없거나 본인 거 아니면 404)."""
    result = await db.execute(
        select(VerificationHistory, VideoWatermarked)
        .join(
            VideoWatermarked,
            VerificationHistory.video_watermarked_id == VideoWatermarked.id,
        )
        .where(
            VerificationHistory.id == verification_id,
            VerificationHistory.admin_id == admin_id,
        )
    )
    row = result.one_or_none()
    if row is None:
        raise VerificationDetailNotFoundError()

    v, w = row
    return VerificationDetailData(
        id=v.id,
        status=_status_value(v.status),
        accuracy=v.accuracy,
        extractDuration=v.extract_duration,
        createdAt=v.created_at,
        videoWatermarkedId=w.id,
        originalFileName=w.original_file_name,
        storedFileName=w.stored_file_name,
        thumbnailUrl=_thumbnail_url(w.thumbnail_name),
        fileType=w.file_type,
        fileSize=w.file_size,
        durationSec=w.duration_sec,
        embedPsnr=w.embed_psnr,
        alpha=w.alpha,
        watermarkHex=w.watermark_hex,
        contentUuid=w.content_uuid,
        embedProcessingTime=w.processing_time,
        embedProcessingFps=w.processing_fps,
        embeddedAt=w.created_at,
        businessId=WATERMARK_BUSINESS_ID,
        payloadBits=PAYLOAD_BITS,
    )
