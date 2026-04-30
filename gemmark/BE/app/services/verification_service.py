"""워터마크 검증 이력 조회 서비스."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification import VerificationHistory
from app.models.video import VideoWatermarked
from app.schemas.verification import VerificationListData, VerificationListItem


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
    """본인이 시도한 검증 이력 목록 (최신순)."""
    base = (
        select(VerificationHistory, VideoWatermarked)
        .join(
            VideoWatermarked,
            VerificationHistory.video_watermarked_id == VideoWatermarked.id,
        )
        .where(VerificationHistory.admin_id == admin_id)
    )

    total_result = await db.execute(
        select(func.count())
        .select_from(VerificationHistory)
        .join(
            VideoWatermarked,
            VerificationHistory.video_watermarked_id == VideoWatermarked.id,
        )
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
            status=v.status.value if hasattr(v.status, "value") else str(v.status),
            originalFileName=w.original_file_name,
            fileSize=w.file_size,
            durationSec=w.duration_sec,
            thumbnailUrl=_thumbnail_url(w.thumbnail_name),
            createdAt=v.created_at,
        )
        for v, w in rows
    ]

    return VerificationListData(items=items, total=total, page=page, size=size)
