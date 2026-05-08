import asyncio
import logging
import tempfile
import time
from datetime import date, datetime, time as dtime
from pathlib import Path

logger = logging.getLogger(__name__)

import cv2
import numpy as np
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.core.exceptions import (
    InvalidDateRangeError,
    RobustnessExecutionError,
    RobustnessInvalidDateFormatError,
    RobustnessNoTargetVideoError,
    RobustnessRequiredParameterError,
    RobustnessStartAfterEndError,
    RobustnessTestNotFoundError,
    RobustnessTestVideoNotFoundError,
    RobustnessWatermarkFileNotFoundError,
)
from app.models.admin import Admin
from app.models.robustness import (
    RobustnessAttackDetail,
    RobustnessAttackType,
    RobustnessTest,
    RobustnessTestStatus,
    RobustnessTestVideo,
)
from app.models.video import VideoWatermarked
from app.schemas.robustness import (
    FailedVideoItem,
    RobustnessAttackItem,
    RobustnessAttackResultData,
    RobustnessHistoryItem,
    RobustnessRunData,
    RobustnessStatusData,
    RobustnessTestDetailData,
    RobustnessVideoInfoData,
    TestPassedStatus,
)
from app.schemas.video import VideoListData, VideoListItem
from app.services.watermark.attacks import (
    ATTACK_H264_REENCODE,
    ATTACK_TYPES,
    FRAME_ATTACKS,
    h264_reencode,
)
from app.services.watermark.dct import (
    DEFAULT_KEY,
    extract as dct_extract,
    hex_to_bits,
)
from app.services.watermark.metrics import ber as calc_ber, psnr as calc_psnr
from app.services.watermark.payload import PAYLOAD_BITS


_PASS_BER_THRESHOLD = 0.1
_N_SAMPLE_FRAMES = 5
_MAX_CONCURRENT_RUNS = 2
_run_semaphore = asyncio.Semaphore(_MAX_CONCURRENT_RUNS)
# create_task로 만든 백그라운드 태스크가 GC되지 않도록 강한 참조 유지
_bg_tasks: set[asyncio.Task] = set()


# ──────────────────────────────────────────────────────
# 기존: 강건성 테스트 대상 영상 목록 조회
# ──────────────────────────────────────────────────────
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
            VideoWatermarked.created_at >= datetime.combine(start_date, dtime.min)
        )
    if end_date is not None:
        base = base.where(
            VideoWatermarked.created_at <= datetime.combine(end_date, dtime.max)
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


# ──────────────────────────────────────────────────────
# 강건성 테스트 실행
# ──────────────────────────────────────────────────────
def _parse_date(value: str | None) -> date:
    if not value:
        raise RobustnessRequiredParameterError()
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise RobustnessInvalidDateFormatError()


def _sample_frames_from_path(src_path: Path, n: int) -> list[np.ndarray]:
    cap = cv2.VideoCapture(str(src_path))
    if not cap.isOpened():
        return []
    try:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0:
            return []
        indices = np.linspace(0, total - 1, min(n, total), dtype=int)
        frames: list[np.ndarray] = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ret, frame = cap.read()
            if ret:
                frames.append(frame)
        return frames
    finally:
        cap.release()


def _majority_vote_extract(
    frames: list[np.ndarray], wm_len: int, key: int, alpha: float
) -> np.ndarray:
    if not frames:
        return np.zeros(wm_len, dtype=np.uint8)
    votes = np.zeros(wm_len, dtype=np.int32)
    n_extracted = 0
    for f in frames:
        try:
            bits = dct_extract(f, wm_len, key=key, alpha=alpha)
        except ValueError:
            continue
        votes += bits.astype(np.int32)
        n_extracted += 1
    if n_extracted == 0:
        return np.zeros(wm_len, dtype=np.uint8)
    return (votes > n_extracted / 2).astype(np.uint8)


def _run_video_test(
    src_path: Path,
    watermark_hex: str,
    alpha: float,
    key: int,
) -> dict:
    """단일 영상에 대해 7가지 공격을 실행하고 공격별 BER/PSNR/시간을 반환."""
    original_bits = hex_to_bits(watermark_hex)
    wm_len = min(len(original_bits), PAYLOAD_BITS)
    original_bits = original_bits[:wm_len]

    wm_frames = _sample_frames_from_path(src_path, _N_SAMPLE_FRAMES)
    if not wm_frames:
        raise RuntimeError(f"프레임을 읽을 수 없습니다: {src_path}")

    details: dict[str, dict] = {}

    # 프레임 단위 공격 6종
    for attack_id, attack_fn in FRAME_ATTACKS.items():
        t0 = time.time()
        attacked_frames = [attack_fn(f) for f in wm_frames]
        ext_bits = _majority_vote_extract(attacked_frames, wm_len, key, alpha)
        elapsed = time.time() - t0

        ber_val = float(calc_ber(original_bits, ext_bits))
        psnr_val = float(calc_psnr(wm_frames[0], attacked_frames[0]))
        details[attack_id] = {
            "ber": ber_val,
            "psnr": psnr_val,
            "duration": elapsed,
        }

    # 영상 단위 공격: H.264 재인코딩
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        t0 = time.time()
        h264_reencode(src_path, tmp_path)
        attacked_frames = _sample_frames_from_path(tmp_path, _N_SAMPLE_FRAMES)
        ext_bits = _majority_vote_extract(attacked_frames, wm_len, key, alpha)
        elapsed = time.time() - t0

        ber_val = float(calc_ber(original_bits, ext_bits))
        if attacked_frames and wm_frames:
            ref = wm_frames[0]
            atk = attacked_frames[0]
            if ref.shape != atk.shape:
                atk = cv2.resize(atk, (ref.shape[1], ref.shape[0]))
            psnr_val = float(calc_psnr(ref, atk))
        else:
            psnr_val = 0.0
        details[ATTACK_H264_REENCODE] = {
            "ber": ber_val,
            "psnr": psnr_val,
            "duration": elapsed,
        }
    finally:
        tmp_path.unlink(missing_ok=True)

    return details


async def run_robustness_test(
    db: AsyncSession,
    admin_id: int,
    start_date_str: str | None,
    end_date_str: str | None,
) -> RobustnessRunData:
    """강건성 테스트 실행 접수.

    검증 + IN_PROGRESS 레코드 INSERT만 수행하고, 실제 영상 처리는
    백그라운드 태스크(`_execute_robustness_test_bg`)로 분리해 즉시 반환한다.
    """
    start_dt = _parse_date(start_date_str)
    end_dt = _parse_date(end_date_str)
    if start_dt > end_dt:
        raise RobustnessStartAfterEndError()

    rows_result = await db.execute(
        select(VideoWatermarked)
        .where(
            VideoWatermarked.admin_id == admin_id,
            VideoWatermarked.deleted_at.is_(None),
            VideoWatermarked.created_at >= datetime.combine(start_dt, dtime.min),
            VideoWatermarked.created_at <= datetime.combine(end_dt, dtime.max),
        )
        .order_by(VideoWatermarked.created_at.asc())
    )
    videos = rows_result.scalars().all()
    if not videos:
        raise RobustnessNoTargetVideoError()

    for video in videos:
        src_path = settings.WATERMARKED_DIR / video.stored_file_name
        if not src_path.exists():
            logger.error(
                "video_id=%s 워터마크 영상 파일 없음 (path=%s)", video.id, src_path
            )
            raise RobustnessWatermarkFileNotFoundError()

    test_record = RobustnessTest(
        admin_id=admin_id,
        filter_start_at=start_dt,
        filter_end_at=end_dt,
        status=RobustnessTestStatus.IN_PROGRESS,
        total_count=len(videos),
        processed_count=0,
        success_count=0,
        fail_count=0,
        avg_ber=0.0,
        avg_psnr=0.0,
        avg_duration=0.0,
    )
    db.add(test_record)
    try:
        await db.commit()
        await db.refresh(test_record)
    except Exception:
        logger.exception("robustness_test INSERT 실패")
        await db.rollback()
        raise RobustnessExecutionError()

    test_id = test_record.id

    video_ids = [video.id for video in videos]
    task = asyncio.create_task(_execute_robustness_test_bg(test_id, video_ids))
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    return RobustnessRunData(
        testId=test_id,
        status=RobustnessTestStatus.IN_PROGRESS,
    )


async def _execute_robustness_test_bg(
    test_id: int,
    video_ids: list[int],
) -> None:
    """백그라운드: 영상별 처리 → 영상마다 commit으로 진행률 갱신."""
    async with _run_semaphore:
        async with AsyncSessionLocal() as session:
            try:
                videos_result = await session.execute(
                    select(VideoWatermarked)
                    .where(VideoWatermarked.id.in_(video_ids))
                    .order_by(VideoWatermarked.created_at.asc())
                )
                videos = videos_result.scalars().all()

                success_count = 0
                fail_count = 0
                total_ber = 0.0
                total_psnr = 0.0
                total_duration = 0.0
                processed = 0

                for video in videos:
                    src_path = settings.WATERMARKED_DIR / video.stored_file_name
                    details = await asyncio.to_thread(
                        _run_video_test,
                        src_path,
                        video.watermark_hex,
                        float(video.alpha),
                        DEFAULT_KEY,
                    )

                    avg_ber = sum(d["ber"] for d in details.values()) / len(details)
                    psnr_vals = [
                        d["psnr"] for d in details.values() if np.isfinite(d["psnr"])
                    ]
                    avg_psnr = (
                        sum(psnr_vals) / len(psnr_vals) if psnr_vals else 0.0
                    )
                    avg_duration = sum(d["duration"] for d in details.values()) / len(
                        details
                    )
                    passed = avg_ber < _PASS_BER_THRESHOLD

                    video_record = RobustnessTestVideo(
                        robustness_test_id=test_id,
                        video_watermarked_id=video.id,
                        avg_ber=round(avg_ber, 6),
                        avg_psnr=round(avg_psnr, 4),
                        avg_duration=round(avg_duration, 4),
                        passed=passed,
                    )
                    session.add(video_record)
                    await session.flush()

                    for attack_id, d in details.items():
                        psnr_val = d["psnr"] if np.isfinite(d["psnr"]) else 0.0
                        session.add(
                            RobustnessAttackDetail(
                                robustness_test_video_id=video_record.id,
                                attack_type_id=attack_id,
                                ber=round(d["ber"], 6),
                                psnr=round(psnr_val, 4),
                                duration=round(d["duration"], 4),
                            )
                        )

                    if passed:
                        success_count += 1
                    else:
                        fail_count += 1

                    total_ber += avg_ber
                    total_psnr += avg_psnr
                    total_duration += avg_duration
                    processed += 1

                    await session.execute(
                        update(RobustnessTest)
                        .where(RobustnessTest.id == test_id)
                        .values(
                            processed_count=processed,
                            success_count=success_count,
                            fail_count=fail_count,
                        )
                    )
                    await session.commit()

                n = len(videos)
                if n > 0:
                    overall_ber = total_ber / n
                    overall_psnr = total_psnr / n
                    overall_duration = total_duration / n
                else:
                    overall_ber = overall_psnr = overall_duration = 0.0

                await session.execute(
                    update(RobustnessTest)
                    .where(RobustnessTest.id == test_id)
                    .values(
                        avg_ber=round(overall_ber, 6),
                        avg_psnr=round(overall_psnr, 4),
                        avg_duration=round(overall_duration, 4),
                        status=RobustnessTestStatus.COMPLETED,
                    )
                )
                await session.commit()
            except Exception:
                logger.exception(
                    "강건성 테스트 백그라운드 처리 실패 (test_id=%s)", test_id
                )
                await session.rollback()
                try:
                    await session.execute(
                        update(RobustnessTest)
                        .where(RobustnessTest.id == test_id)
                        .values(status=RobustnessTestStatus.ERROR)
                    )
                    await session.commit()
                except Exception:
                    logger.exception(
                        "test_record ERROR 상태 업데이트 실패 (test_id=%s)", test_id
                    )
                    await session.rollback()


async def get_robustness_test_status(
    db: AsyncSession,
    test_id: int,
) -> RobustnessStatusData:
    result = await db.execute(
        select(
            RobustnessTest.status,
            RobustnessTest.processed_count,
            RobustnessTest.total_count,
            RobustnessTest.success_count,
            RobustnessTest.fail_count,
        ).where(RobustnessTest.id == test_id)
    )
    row = result.first()
    if row is None:
        raise RobustnessTestNotFoundError()
    return RobustnessStatusData(
        status=row.status,
        processedCount=row.processed_count,
        totalCount=row.total_count,
        successCount=row.success_count,
        failCount=row.fail_count,
    )


# ──────────────────────────────────────────────────────
# 강건성 테스트 상세 - 영상 기본 정보 조회
# ──────────────────────────────────────────────────────
async def get_robustness_test_video_info(
    db: AsyncSession,
    test_id: int,
    video_id: int,
) -> RobustnessVideoInfoData:
    test_exists = await db.execute(
        select(RobustnessTest.id).where(RobustnessTest.id == test_id)
    )
    if test_exists.scalar_one_or_none() is None:
        raise RobustnessTestNotFoundError()

    result = await db.execute(
        select(
            VideoWatermarked.original_file_name,
            VideoWatermarked.content_uuid,
            VideoWatermarked.created_at,
            VideoWatermarked.file_size,
            RobustnessTestVideo.created_at.label("test_created_at"),
            RobustnessTestVideo.passed,
            Admin.admin_id,
        )
        .join(
            RobustnessTestVideo,
            RobustnessTestVideo.video_watermarked_id == VideoWatermarked.id,
        )
        .join(
            RobustnessTest,
            RobustnessTest.id == RobustnessTestVideo.robustness_test_id,
        )
        .join(Admin, Admin.id == RobustnessTest.admin_id)
        .where(
            RobustnessTestVideo.robustness_test_id == test_id,
            RobustnessTestVideo.video_watermarked_id == video_id,
        )
    )
    row = result.first()
    if row is None:
        raise RobustnessTestVideoNotFoundError()

    return RobustnessVideoInfoData(
        videoFileName=row.original_file_name,
        videoUuid=row.content_uuid,
        createDate=row.created_at,
        fileSize=row.file_size,
        testDate=row.test_created_at,
        testPassed=TestPassedStatus.SUCCESS if row.passed else TestPassedStatus.FAILED,
        adminId=row.admin_id,
    )


# ──────────────────────────────────────────────────────
# 강건성 테스트 상세 - 공격 유형별 결과 조회
# ──────────────────────────────────────────────────────

# 요약 지표
def _calc_total_score(avg_ber: float, avg_psnr: float, avg_duration: float) -> int:
    # BER: 0에 가까울수록 좋음 (50점 만점) — BER 0%→50점, 10% 이상→0점
    ber_score = max(0.0, 50.0 * (1 - avg_ber / 0.10))
    # PSNR: 43 dB이 최적 (35점 만점) — 43dB→35점, ±20dB 이상→0점
    psnr_score = max(0.0, 35.0 * (1 - abs(avg_psnr - 43) / 20))
    # Duration: 낮을수록 좋음, 초 단위 기준 (15점 만점) — 0.033s 이하→15점, 0.2s 이상→0점
    duration_score = max(0.0, 15.0 * (1 - avg_duration / 0.2))
    return round(ber_score + psnr_score + duration_score)

# 공격 유형별 상세
async def get_robustness_attack_results(
    db: AsyncSession,
    test_id: int,
    video_id: int,
) -> RobustnessAttackResultData:
    test_exists = await db.execute(
        select(RobustnessTest.id).where(RobustnessTest.id == test_id)
    )
    if test_exists.scalar_one_or_none() is None:
        raise RobustnessTestNotFoundError()

    rtv_result = await db.execute(
        select(RobustnessTestVideo).where(
            RobustnessTestVideo.robustness_test_id == test_id,
            RobustnessTestVideo.video_watermarked_id == video_id,
        )
    )
    rtv = rtv_result.scalar_one_or_none()
    if rtv is None:
        raise RobustnessTestVideoNotFoundError()

    details_result = await db.execute(
        select(
            RobustnessAttackType.type_name,
            RobustnessAttackDetail.ber,
            RobustnessAttackDetail.psnr,
            RobustnessAttackDetail.duration,
        )
        .join(
            RobustnessAttackType,
            RobustnessAttackType.id == RobustnessAttackDetail.attack_type_id,
        )
        .where(RobustnessAttackDetail.robustness_test_video_id == rtv.id)
        .order_by(RobustnessAttackType.id)
    )
    rows = details_result.all()

    attacks = [
        RobustnessAttackItem(
            type=row.type_name,
            ber=row.ber,
            psnr=row.psnr,
            duration=row.duration,
        )
        for row in rows
    ]

    return RobustnessAttackResultData(
        avgBer=rtv.avg_ber,
        avgPsnr=rtv.avg_psnr,
        avgDuration=rtv.avg_duration,
        totalScore=_calc_total_score(rtv.avg_ber, rtv.avg_psnr, rtv.avg_duration),
        attacks=attacks,
    )


# ──────────────────────────────────────────────────────
# 강건성 테스트 상세 조회
# ──────────────────────────────────────────────────────
async def get_robustness_test_detail(
    db: AsyncSession,
    test_id: int,
) -> RobustnessTestDetailData:
    test_result = await db.execute(
        select(RobustnessTest, Admin.admin_id)
        .join(Admin, Admin.id == RobustnessTest.admin_id)
        .where(RobustnessTest.id == test_id)
    )
    row = test_result.first()
    if row is None:
        raise RobustnessTestNotFoundError()

    test, admin_name = row

    videos_result = await db.execute(
        select(
            RobustnessTestVideo.avg_ber,
            RobustnessTestVideo.avg_psnr,
            RobustnessTestVideo.avg_duration,
        ).where(RobustnessTestVideo.robustness_test_id == test_id)
    )
    video_rows = videos_result.all()

    if len(video_rows) > 1:
        bers = np.array([r.avg_ber for r in video_rows], dtype=float)
        psnrs = np.array([r.avg_psnr for r in video_rows], dtype=float)
        durations = np.array([r.avg_duration for r in video_rows], dtype=float)
        sd_ber = float(np.std(bers, ddof=1))
        sd_psnr = float(np.std(psnrs, ddof=1))
        sd_duration = float(np.std(durations, ddof=1))
    else:
        sd_ber = 0.0
        sd_psnr = 0.0
        sd_duration = 0.0

    failed_result = await db.execute(
        select(
            VideoWatermarked.id,
            VideoWatermarked.original_file_name,
            VideoWatermarked.alpha,
            RobustnessTestVideo.passed,
        )
        .join(
            RobustnessTestVideo,
            RobustnessTestVideo.video_watermarked_id == VideoWatermarked.id,
        )
        .where(
            RobustnessTestVideo.robustness_test_id == test_id,
            RobustnessTestVideo.passed.is_(False),
        )
        .order_by(VideoWatermarked.id.asc())
    )
    failed_rows = failed_result.all()

    failed_videos = [
        FailedVideoItem(
            id=r.id,
            fileName=r.original_file_name,
            alpha=int(r.alpha),
            passed=r.passed,
        )
        for r in failed_rows
    ]

    return RobustnessTestDetailData(
        startDate=test.filter_start_at,
        endDate=test.filter_end_at,
        admin=admin_name,
        totalCount=test.total_count,
        successCount=test.success_count,
        failCount=test.fail_count,
        avgBer=test.avg_ber,
        avgPsnr=test.avg_psnr,
        avgDuration=test.avg_duration,
        sdBer=round(sd_ber, 6),
        sdPsnr=round(sd_psnr, 4),
        sdDuration=round(sd_duration, 4),
        failedVideos=failed_videos,
    )


# ──────────────────────────────────────────────────────
# 강건성 테스트 이력 조회
# ──────────────────────────────────────────────────────
async def list_robustness_history(
    db: AsyncSession,
    admin_id: int,
) -> list[RobustnessHistoryItem]:
    result = await db.execute(
        select(
            RobustnessTest.id,
            RobustnessTest.filter_start_at,
            RobustnessTest.filter_end_at,
            RobustnessTest.status,
            RobustnessTest.total_count,
            RobustnessTest.success_count,
            RobustnessTest.fail_count,
            RobustnessTest.created_at,
            Admin.admin_id,
        )
        .join(Admin, Admin.id == RobustnessTest.admin_id)
        .where(RobustnessTest.admin_id == admin_id)
        .order_by(RobustnessTest.created_at.desc())
    )
    rows = result.all()

    return [
        RobustnessHistoryItem(
            testId=row.id,
            startDate=row.filter_start_at,
            endDate=row.filter_end_at,
            status=row.status,
            totalCount=row.total_count,
            successCount=row.success_count,
            failCount=row.fail_count,
            admin=row.admin_id,
            testDate=row.created_at,
        )
        for row in rows
    ]
