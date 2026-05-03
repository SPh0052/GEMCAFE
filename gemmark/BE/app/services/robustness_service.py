from datetime import date, datetime, time

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidDateRangeError
from app.models.video import VideoWatermarked
from app.schemas.video import VideoListData, VideoListItem


async def list_robustness_target_videos(
    db: AsyncSession,
    admin_id: int,
    page: int,
    size: int,
    start_date: date | None,
    end_date: date | None,
) -> VideoListData:
    """강건성 테스트 대상 영상 목록 조회.

    워터마크 삽입된 영상(soft-delete 제외) 중 created_at 기간 필터를
    선택적으로 적용한다. start_date/end_date 모두 inclusive.
    """
    if start_date is not None and end_date is not None and start_date > end_date:
        raise InvalidDateRangeError()

    base = select(VideoWatermarked).where(
        VideoWatermarked.admin_id == admin_id,
        VideoWatermarked.deleted_at.is_(None),
    )

    if start_date is not None:
        base = base.where(
            VideoWatermarked.created_at >= datetime.combine(start_date, time.min)
        )
    if end_date is not None:
        base = base.where(
            VideoWatermarked.created_at <= datetime.combine(end_date, time.max)
        )

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = int(total_result.scalar_one())

    rows_result = await db.execute(
        base.order_by(VideoWatermarked.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    rows = rows_result.scalars().all()

    items = [
        VideoListItem(
            id=row.id,
            contentUuid=row.content_uuid,
            name=row.original_file_name,
            type=row.file_type,
            size=row.file_size,
            createdAt=row.created_at,
        )
        for row in rows
    ]

    return VideoListData(items=items, total=total, page=page, size=size)
