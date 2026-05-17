"""워터마크 삽입/검증 오케스트레이션 서비스."""

import asyncio
import uuid
from datetime import datetime
from pathlib import Path

from app.core.config import (
    KST,
    WATERMARK_BUSINESS_ID,
    WATERMARK_DEFAULT_DOWNLOADER,
    settings,
)
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AlreadyWatermarkedError,
    DownloadError,
    DownloadNotWatermarkedError,
    DownloadVideoNotFoundError,
    VerifyVideoIdMissingError,
    VerifyVideoNotFoundError,
    VideoIdMissingError,
    VideoNotFoundError,
    WatermarkEmbedError,
    WatermarkVerifyError,
)
from sqlalchemy import select, update

from app.models.verification import VerificationHistory, VerificationStatus
from app.models.video import VideoWatermarked
from app.schemas.watermark import WatermarkEmbedData, WatermarkVerifyData
from app.services import video_service
from app.services.watermark.dct import bits_to_hex, hex_to_bits
from app.services.watermark.metrics import ber as calc_ber
from app.services.watermark.payload import PAYLOAD_BITS, make_payload_bits
from app.services.watermark.video import (
    embed_video_file,
    extract_video_file,
    save_first_frame,
)


_VERIFY_BER_THRESHOLD = 0.1


def _strip_video_prefix(video_id: str) -> str:
    return video_id[2:] if video_id.startswith("v_") else video_id


async def embed_watermark(
    db: AsyncSession,
    admin_id: int,
    video_id: str | None,
    alpha: int | None = None,
    downloader_user_id: str = WATERMARK_DEFAULT_DOWNLOADER,
) -> WatermarkEmbedData:
    if not video_id:
        raise VideoIdMissingError()

    info = video_service.get_video_info(video_id)
    if info is None:
        raise VideoNotFoundError()

    src_path = Path(info["file_path"])
    if not src_path.exists():
        raise VideoNotFoundError()

    if video_service.is_watermarked(video_id):
        raise AlreadyWatermarkedError()

    effective_alpha = int(alpha) if alpha is not None else int(settings.WATERMARK_ALPHA)

    video_uuid = _strip_video_prefix(video_id)
    payload = make_payload_bits(video_uuid, downloader_user_id)

    settings.WATERMARKED_DIR.mkdir(parents=True, exist_ok=True)
    dest_path = settings.WATERMARKED_DIR / f"{video_uuid}.mp4"

    try:
        stats = await asyncio.to_thread(
            embed_video_file,
            src_path,
            dest_path,
            payload,
            settings.WATERMARK_KEY,
            float(effective_alpha),
        )
    except Exception:
        dest_path.unlink(missing_ok=True)
        raise WatermarkEmbedError()

    watermark_id = f"wm_{uuid.uuid4().hex[:8]}"
    video_service.mark_watermarked(video_id, watermark_id)

    payload_hex = bits_to_hex(payload)
    created_at = datetime.now(KST)

    thumb_path = settings.WATERMARKED_DIR / f"{video_uuid}.jpg"
    thumb_ok = await asyncio.to_thread(save_first_frame, dest_path, thumb_path)
    thumbnail_name = thumb_path.name if thumb_ok else None

    record = VideoWatermarked(
        admin_id=admin_id,
        content_uuid=video_uuid,
        watermark_hex=payload_hex,
        alpha=effective_alpha,
        original_file_name=info["original_filename"],
        stored_file_name=dest_path.name,
        thumbnail_name=thumbnail_name,
        file_type=dest_path.suffix.lstrip(".").lower(),
        file_size=dest_path.stat().st_size,
        duration_sec=stats["duration_sec"],
        embed_psnr=stats["psnr"],
        processing_time=stats.get("processing_time"),
        processing_fps=stats.get("processing_fps"),
    )
    try:
        db.add(record)
        await db.commit()
    except Exception:
        await db.rollback()
        dest_path.unlink(missing_ok=True)
        thumb_path.unlink(missing_ok=True)
        raise WatermarkEmbedError()

    return WatermarkEmbedData(
        success=True,
        processingTime=stats["processing_time"],
        psnr=stats["psnr"],
        watermarkHex=payload_hex,
        contentUuid=video_uuid,
        timestamp=created_at,
    )


# ──────────────────────────────────────────────────────────
# External embed (gemcafe → gemmark, internal HTTP, gateway-net 신뢰)
# ──────────────────────────────────────────────────────────


async def embed_watermark_external(
    db: AsyncSession,
    source_file_path: str,
    downloader_user_id: str,
    alpha: int | None = None,
) -> dict:
    """gemcafe 등 외부 서비스가 호출하는 경량 워터마크 삽입.

    - in-memory 등록부 skip (gemmark 어드민 UI 흐름과 무관)
    - 원본 파일 경로를 직접 받아 같은 파일명으로 WATERMARKED_DIR 에 저장
    - video_watermarked DB 행은 기록 (verify 시 매칭되도록)
        admin_id 는 settings.WATERMARK_SYSTEM_ADMIN_ID 의 system 계정 사용
    - 인증 없음 (gateway-net 내부 호출만 도달 가능한 전제)
    """
    src_path = Path(source_file_path)
    if not src_path.exists():
        raise VideoNotFoundError()

    effective_alpha = int(alpha) if alpha is not None else int(settings.WATERMARK_ALPHA)

    # 원본 파일명에서 .mp4 떼고 uuid 부분만 payload 에 사용
    video_uuid = src_path.stem
    payload = make_payload_bits(video_uuid, downloader_user_id)

    settings.WATERMARKED_DIR.mkdir(parents=True, exist_ok=True)
    dest_path = settings.WATERMARKED_DIR / src_path.name

    try:
        stats = await asyncio.to_thread(
            embed_video_file,
            src_path,
            dest_path,
            payload,
            settings.WATERMARK_KEY,
            float(effective_alpha),
        )
    except Exception:
        dest_path.unlink(missing_ok=True)
        raise WatermarkEmbedError()

    payload_hex = bits_to_hex(payload)

    # 썸네일 생성 (검증 결과 UI 등에서 활용)
    thumb_path = settings.WATERMARKED_DIR / f"{video_uuid}.jpg"
    thumb_ok = await asyncio.to_thread(save_first_frame, dest_path, thumb_path)
    thumbnail_name = thumb_path.name if thumb_ok else None

    # 동일 content_uuid 의 기존 활성 행이 있으면 soft-delete 처리한 뒤 새 행 INSERT.
    # → 사용자가 같은 영상 재공유 / alpha 재설정 등으로 여러 번 호출해도
    #   "가장 최신 활성 행은 항상 1개" 가 보장돼, 영상 상세/검증 조회가 안 깨짐.
    # → verification_history 의 FK 는 옛 행을 그대로 가리키므로 깨질 일 없음.
    now = datetime.now(KST)
    await db.execute(
        update(VideoWatermarked)
        .where(
            VideoWatermarked.content_uuid == video_uuid,
            VideoWatermarked.deleted_at.is_(None),
        )
        .values(deleted_at=now)
    )

    # video_watermarked 행 INSERT — verify 시 watermark_hex 매칭에 사용.
    # admin_id 는 gemcafe origin 영상용 system 계정 (사전에 admin 테이블에 존재해야 함).
    record = VideoWatermarked(
        admin_id=settings.WATERMARK_SYSTEM_ADMIN_ID,
        content_uuid=video_uuid,
        watermark_hex=payload_hex,
        alpha=effective_alpha,
        original_file_name=src_path.name,
        stored_file_name=dest_path.name,
        thumbnail_name=thumbnail_name,
        file_type=dest_path.suffix.lstrip(".").lower(),
        file_size=dest_path.stat().st_size,
        duration_sec=stats["duration_sec"],
        embed_psnr=stats["psnr"],
        processing_time=stats.get("processing_time"),
        processing_fps=stats.get("processing_fps"),
    )
    try:
        db.add(record)
        await db.commit()
    except Exception:
        await db.rollback()
        dest_path.unlink(missing_ok=True)
        if thumbnail_name:
            thumb_path.unlink(missing_ok=True)
        raise WatermarkEmbedError()

    return {
        "storedFileName": dest_path.name,
        "fileSize": dest_path.stat().st_size,
        "durationSec": stats["duration_sec"],
        "watermarkHex": payload_hex,
        "processingTime": stats.get("processing_time"),
    }


# ──────────────────────────────────────────────────────────
# Verify
# ──────────────────────────────────────────────────────────


def _resolve_verify_target(info: dict, video_id: str) -> Path:
    """검증 대상 파일 경로 결정.

    - 워터마크된 영상이 존재 → 그것을 검증 (기본)
    - 워터마크 안 된 경우 → 업로드된 원본 파일을 검증 (외부 워터마크 검출 시도용)
    """
    if info.get("watermark_id"):
        video_uuid = _strip_video_prefix(video_id)
        watermarked_path = settings.WATERMARKED_DIR / f"{video_uuid}.mp4"
        if watermarked_path.exists():
            return watermarked_path

    original_path = Path(info["file_path"])
    if original_path.exists():
        return original_path

    raise VerifyVideoNotFoundError()


async def verify_watermark(
    db: AsyncSession,
    admin_id: int,
    video_id: str | None,
) -> WatermarkVerifyData:
    """videoId로 워터마크 영상 검증.

    검색 경로 (우선순위):
      1. in-memory 등록부 (gemmark 어드민 업로드 흐름)
      2. WATERMARKED_DIR/<uuid>.mp4 직접 (gemcafe origin 등 외부 등록 영상)
    """
    if not video_id:
        raise VerifyVideoIdMissingError()

    video_uuid = _strip_video_prefix(video_id)

    info = video_service.get_video_info(video_id)
    if info is not None:
        src_path = _resolve_verify_target(info, video_id)
    else:
        # 등록부 miss — gemcafe origin 등 외부에서 embed-from-path 로 들어온 영상.
        # WATERMARKED_DIR 에 같은 uuid 의 워터마크 파일이 있으면 그것으로 검증.
        candidate = settings.WATERMARKED_DIR / f"{video_uuid}.mp4"
        if not candidate.exists():
            raise VerifyVideoNotFoundError()
        src_path = candidate

    try:
        extracted_bits, _stats = await asyncio.to_thread(
            extract_video_file,
            src_path,
            PAYLOAD_BITS,
            settings.WATERMARK_KEY,
            settings.WATERMARK_ALPHA,
            8,
        )
    except Exception:
        raise WatermarkVerifyError()

    matched_row, best_ber = await _find_matching_watermark_in_db(
        db, extracted_bits, ber_threshold=_VERIFY_BER_THRESHOLD
    )

    extract_duration = float(_stats.get("processing_time", 0.0))

    if matched_row is None:
        # 매칭 실패 — 어떤 영상인지 모르므로 video_watermarked_id는 NULL
        await _log_verification(
            db,
            admin_id=admin_id,
            video_watermarked_id=None,
            status=VerificationStatus.NOT_DETECTED,
            accuracy=0.0,
            extract_duration=extract_duration,
        )
        return WatermarkVerifyData(
            isWatermarked=False,
            videoUuid=None,
            businessId=None,
            createdAt=None,
            ber=None,
        )

    # 매칭 성공 — 검출된 워터마크의 원본 video_watermarked.id로 기록
    accuracy = round(max(0.0, (1.0 - best_ber) * 100.0), 2)
    await _log_verification(
        db,
        admin_id=admin_id,
        video_watermarked_id=matched_row.id,
        status=VerificationStatus.DETECTED,
        accuracy=accuracy,
        extract_duration=extract_duration,
    )

    return WatermarkVerifyData(
        isWatermarked=True,
        videoUuid=matched_row.content_uuid,
        businessId=WATERMARK_BUSINESS_ID,
        createdAt=matched_row.created_at,
        ber=round(best_ber, 4),
    )


async def _find_matching_watermark_in_db(
    db: AsyncSession,
    extracted_bits,
    ber_threshold: float = 0.1,
) -> tuple[VideoWatermarked | None, float]:
    """DB의 모든 video_watermarked 행에서 BER이 가장 낮은 매칭 검색.

    in-memory 등록부 대신 DB의 watermark_hex로 매칭 → 서버 재시작에도 안전.
    """
    result = await db.execute(
        select(VideoWatermarked).where(VideoWatermarked.deleted_at.is_(None))
    )
    rows = result.scalars().all()

    best_row: VideoWatermarked | None = None
    best_ber = 1.0

    for row in rows:
        stored_bits = hex_to_bits(row.watermark_hex)
        current_ber = calc_ber(stored_bits, extracted_bits)
        if current_ber < best_ber:
            best_ber = current_ber
            best_row = row

    if best_row is not None and best_ber <= ber_threshold:
        return best_row, best_ber
    return None, best_ber


async def _log_verification(
    db: AsyncSession,
    *,
    admin_id: int,
    video_watermarked_id: int | None,
    status: VerificationStatus,
    accuracy: float,
    extract_duration: float,
) -> None:
    log = VerificationHistory(
        video_watermarked_id=video_watermarked_id,
        admin_id=admin_id,
        status=status,
        accuracy=accuracy,
        extract_duration=extract_duration,
    )
    try:
        db.add(log)
        await db.commit()
    except Exception:
        await db.rollback()
        raise WatermarkVerifyError()


# ──────────────────────────────────────────────────────────
# Download
# ──────────────────────────────────────────────────────────


async def download_watermarked_video(
    db: AsyncSession,
    video_id_or_uuid: str,
) -> FileResponse:
    """워터마크 삽입된 영상 파일 다운로드.

    - DB의 video_watermarked 테이블에서 content_uuid로 조회 (서버 재시작 안전)
    - `v_xxx` prefix가 붙어 있어도 자동으로 제거하고 조회
    - 파일명은 `watermarked_{원본파일명stem}.mp4` 형태
    """
    content_uuid = _strip_video_prefix(video_id_or_uuid)

    result = await db.execute(
        select(VideoWatermarked).where(
            VideoWatermarked.content_uuid == content_uuid,
            VideoWatermarked.deleted_at.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise DownloadVideoNotFoundError()

    file_path = settings.WATERMARKED_DIR / row.stored_file_name
    if not file_path.exists():
        raise DownloadVideoNotFoundError()

    try:
        base_name = Path(row.original_file_name).stem
        download_name = f"watermarked_{base_name}.mp4"

        return FileResponse(
            path=file_path,
            media_type="video/mp4",
            filename=download_name,
        )
    except Exception:
        raise DownloadError()
