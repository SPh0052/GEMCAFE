import asyncio
import logging
import tempfile
import time
from datetime import date, datetime, time as dtime
from pathlib import Path

logger = logging.getLogger(__name__)

import cv2
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    InvalidDateRangeError,
    RobustnessExecutionError,
    RobustnessInvalidDateFormatError,
    RobustnessNoTargetVideoError,
    RobustnessRequiredParameterError,
    RobustnessStartAfterEndError,
    RobustnessTestNotFoundError,
    RobustnessTestVideoNotFoundError,
)
from app.models.admin import Admin
from app.models.robustness import (
    RobustnessAttackDetail,
    RobustnessTest,
    RobustnessTestStatus,
    RobustnessTestVideo,
)
from app.models.video import VideoWatermarked
from app.schemas.robustness import (
    FailedVideoItem,
    RobustnessRunData,
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
    """강건성 테스트 실행 (동기 처리, CPU 작업은 to_thread로 위임)."""
    start_dt = _parse_date(start_date_str)
    end_dt = _parse_date(end_date_str)
    if start_dt > end_dt:
        raise RobustnessStartAfterEndError()

    # 1) 대상 영상 조회
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

    # 2) robustness_test 레코드 INSERT (IN_PROGRESS)
    test_record = RobustnessTest(
        admin_id=admin_id,
        filter_start_at=start_dt,
        filter_end_at=end_dt,
        status=RobustnessTestStatus.IN_PROGRESS,
        total_count=len(videos),
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

    test_id = test_record.id  # rollback 후 lazy-load 방지용 로컬 캡처

    try:
        success_count = 0
        fail_count = 0
        total_ber = 0.0
        total_psnr = 0.0
        total_duration = 0.0
        failed_items: list[FailedVideoItem] = []

        for video in videos:
            src_path = settings.WATERMARKED_DIR / video.stored_file_name
            logger.warning(
                "[ROB] video_id=%s 시작 stored=%s path=%s exists=%s",
                video.id, video.stored_file_name, src_path, src_path.exists(),
            )
            if not src_path.exists():
                # 파일 누락 → 실패로 카운트, 상세 기록은 0값
                logger.warning(
                    "video_id=%s 워터마크 영상 파일 없음 → fallback 사용 (path=%s)",
                    video.id, src_path,
                )
                details = {
                    aid: {"ber": 1.0, "psnr": 0.0, "duration": 0.0}
                    for aid in ATTACK_TYPES.keys()
                }
            else:
                try:
                    details = await asyncio.to_thread(
                        _run_video_test,
                        src_path,
                        video.watermark_hex,
                        float(video.alpha),
                        DEFAULT_KEY,
                    )
                except Exception:
                    logger.exception(
                        "video_id=%s 강건성 테스트 실패 (path=%s)", video.id, src_path
                    )
                    details = {
                        aid: {"ber": 1.0, "psnr": 0.0, "duration": 0.0}
                        for aid in ATTACK_TYPES.keys()
                    }

            avg_ber = sum(d["ber"] for d in details.values()) / len(details)
            psnr_vals = [d["psnr"] for d in details.values() if np.isfinite(d["psnr"])]
            avg_psnr = sum(psnr_vals) / len(psnr_vals) if psnr_vals else 0.0
            avg_duration = sum(d["duration"] for d in details.values()) / len(details)
            passed = avg_ber < _PASS_BER_THRESHOLD

            video_record = RobustnessTestVideo(
                robustness_test_id=test_record.id,
                video_watermarked_id=video.id,
                avg_ber=round(avg_ber, 6),
                avg_psnr=round(avg_psnr, 4),
                avg_duration=round(avg_duration, 4),
                passed=passed,
            )
            db.add(video_record)
            await db.flush()

            for attack_id, d in details.items():
                psnr_val = d["psnr"] if np.isfinite(d["psnr"]) else 0.0
                db.add(
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
                failed_items.append(
                    FailedVideoItem(
                        id=video.id,
                        fileName=video.original_file_name,
                        alpha=int(video.alpha),
                        passed=False,
                    )
                )

            total_ber += avg_ber
            total_psnr += avg_psnr
            total_duration += avg_duration

        n = len(videos)
        overall_ber = total_ber / n
        overall_psnr = total_psnr / n
        overall_duration = total_duration / n

        test_record.success_count = success_count
        test_record.fail_count = fail_count
        test_record.avg_ber = round(overall_ber, 6)
        test_record.avg_psnr = round(overall_psnr, 4)
        test_record.avg_duration = round(overall_duration, 4)
        test_record.status = RobustnessTestStatus.COMPLETED

        await db.commit()

        return RobustnessRunData(
            totalCount=n,
            successCount=success_count,
            failCount=fail_count,
            averageBer=round(overall_ber, 4),
            averagePsnr=round(overall_psnr, 2),
            averageProcessingTime=round(overall_duration, 2),
            failedVideos=failed_items,
        )
    except Exception:
        logger.exception("강건성 테스트 실행 중 예외 발생 (test_id=%s)", test_id)
        await db.rollback()
        try:
            from sqlalchemy import update
            await db.execute(
                update(RobustnessTest)
                .where(RobustnessTest.id == test_id)
                .values(status=RobustnessTestStatus.ERROR)
            )
            await db.commit()
        except Exception:
            logger.exception("test_record ERROR 상태 업데이트 실패")
            await db.rollback()
        raise RobustnessExecutionError()


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
