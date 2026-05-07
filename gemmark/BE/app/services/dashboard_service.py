from sqlalchemy import case, desc, func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.robustness import (
    RobustnessAttackDetail,
    RobustnessTest,
    RobustnessTestStatus,
    RobustnessTestVideo,
)
from app.models.video import VideoWatermarked
from app.schemas.dashboard import (
    DashboardSummaryData,
    PsnrDistributionBin,
    PsnrDistributionData,
)


_RECENT_PROCESSING_LIMIT = 50

_PSNR_BIN_DEFS: list[tuple[str, float, float | None]] = [
    ("0~10", 0.0, 10.0),
    ("10~20", 10.0, 20.0),
    ("20~30", 20.0, 30.0),
    ("30~40", 30.0, 40.0),
    ("40이상", 40.0, None),
]


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


async def get_psnr_distribution(db: AsyncSession) -> PsnrDistributionData:
    row_number_col = (
        func.row_number()
        .over(
            partition_by=RobustnessTestVideo.video_watermarked_id,
            order_by=(desc(RobustnessTest.created_at), desc(RobustnessTestVideo.id)),
        )
        .label("rn")
    )

    latest_per_video = (
        select(
            RobustnessTestVideo.avg_psnr.label("avg_psnr"),
            row_number_col,
        )
        .join(
            RobustnessTest,
            RobustnessTest.id == RobustnessTestVideo.robustness_test_id,
        )
        .join(
            VideoWatermarked,
            VideoWatermarked.id == RobustnessTestVideo.video_watermarked_id,
        )
        .where(
            RobustnessTest.status == RobustnessTestStatus.COMPLETED,
            VideoWatermarked.deleted_at.is_(None),
        )
        .subquery()
    )

    latest_psnr = latest_per_video.c.avg_psnr
    bucket_col = case(
        (latest_psnr < 10, literal("0~10")),
        (latest_psnr < 20, literal("10~20")),
        (latest_psnr < 30, literal("20~30")),
        (latest_psnr < 40, literal("30~40")),
        else_=literal("40이상"),
    ).label("bucket")

    distribution_stmt = (
        select(bucket_col, func.count().label("cnt"))
        .select_from(latest_per_video)
        .where(latest_per_video.c.rn == 1)
        .group_by(bucket_col)
    )

    rows = (await db.execute(distribution_stmt)).all()
    counts_by_label: dict[str, int] = {row.bucket: int(row.cnt) for row in rows}

    bins = [
        PsnrDistributionBin(
            label=label,
            min=lo,
            max=hi,
            count=counts_by_label.get(label, 0),
        )
        for label, lo, hi in _PSNR_BIN_DEFS
    ]
    total_videos = sum(b.count for b in bins)

    return PsnrDistributionData(bins=bins, totalVideos=total_videos)
