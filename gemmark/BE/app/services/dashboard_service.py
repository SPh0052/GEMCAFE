from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.robustness import (
    RobustnessAttackDetail,
    RobustnessTest,
    RobustnessTestStatus,
    RobustnessTestVideo,
)
from app.models.video import VideoWatermarked
from app.schemas.dashboard import DashboardSummaryData


_RECENT_PROCESSING_LIMIT = 50


async def get_dashboard_summary(db: AsyncSession) -> DashboardSummaryData:
    total_embeds_stmt = select(func.count()).select_from(VideoWatermarked).where(
        VideoWatermarked.deleted_at.is_(None)
    )
    total_embeds = (await db.execute(total_embeds_stmt)).scalar_one()

    recent_speed_subq = (
        select(
            (VideoWatermarked.duration_sec / VideoWatermarked.processing_time).label(
                "speed"
            )
        )
        .where(
            VideoWatermarked.deleted_at.is_(None),
            VideoWatermarked.processing_time.is_not(None),
            VideoWatermarked.processing_time > 0,
        )
        .order_by(desc(VideoWatermarked.created_at))
        .limit(_RECENT_PROCESSING_LIMIT)
        .subquery()
    )
    avg_speed_stmt = select(func.avg(recent_speed_subq.c.speed))
    avg_speed_raw = (await db.execute(avg_speed_stmt)).scalar()
    avg_speed = round(float(avg_speed_raw), 2) if avg_speed_raw is not None else 0.0

    avg_metrics_stmt = (
        select(
            func.avg(RobustnessAttackDetail.ber),
            func.avg(RobustnessAttackDetail.psnr),
        )
        .select_from(RobustnessAttackDetail)
        .join(
            RobustnessTestVideo,
            RobustnessAttackDetail.robustness_test_video_id == RobustnessTestVideo.id,
        )
        .join(
            RobustnessTest,
            RobustnessTestVideo.robustness_test_id == RobustnessTest.id,
        )
        .where(RobustnessTest.status == RobustnessTestStatus.COMPLETED)
    )
    avg_ber_raw, avg_psnr_raw = (await db.execute(avg_metrics_stmt)).one()
    avg_ber = round(float(avg_ber_raw), 2) if avg_ber_raw is not None else 0.0
    avg_psnr = round(float(avg_psnr_raw), 1) if avg_psnr_raw is not None else 0.0

    return DashboardSummaryData(
        totalEmbeds=int(total_embeds),
        avgSpeed=avg_speed,
        avgBer=avg_ber,
        avgPsnr=avg_psnr,
    )
