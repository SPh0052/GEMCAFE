"""워터마크 삽입/검증 오케스트레이션 서비스."""

import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import (
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
from sqlalchemy import select

from app.models.verification import VerificationHistory, VerificationStatus
from app.models.video import VideoWatermarked
from app.schemas.watermark import WatermarkEmbedData, WatermarkVerifyData
from app.services import video_service
from app.services.watermark.dct import bits_to_hex
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
    created_at = datetime.now(timezone.utc)

    video_service.register_watermark_metadata(
        payload_hex=payload_hex,
        video_uuid=video_uuid,
        business_id=WATERMARK_BUSINESS_ID,
        created_at=created_at,
    )

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
    """videoId로 등록된 영상에서 워터마크를 추출하고 등록부와 매칭."""
    if not video_id:
        raise VerifyVideoIdMissingError()

    info = video_service.get_video_info(video_id)
    if info is None:
        raise VerifyVideoNotFoundError()

    src_path = _resolve_verify_target(info, video_id)

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

    metadata, best_ber = video_service.find_matching_watermark(
        extracted_bits, ber_threshold=_VERIFY_BER_THRESHOLD
    )

    extract_duration = float(_stats.get("processing_time", 0.0))

    if metadata is None:
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

    vw_id_result = await db.execute(
        select(VideoWatermarked.id).where(
            VideoWatermarked.content_uuid == metadata["videoUuid"]
        )
    )
    video_watermarked_id = vw_id_result.scalar_one_or_none()

    accuracy = round(max(0.0, (1.0 - best_ber) * 100.0), 2)
    await _log_verification(
        db,
        admin_id=admin_id,
        video_watermarked_id=video_watermarked_id,
        status=VerificationStatus.DETECTED,
        accuracy=accuracy,
        extract_duration=extract_duration,
    )

    return WatermarkVerifyData(
        isWatermarked=True,
        videoUuid=metadata["videoUuid"],
        businessId=metadata["businessId"],
        createdAt=metadata["createdAt"],
        ber=round(best_ber, 4),
    )


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


def download_watermarked_video(video_id: str) -> FileResponse:
    """워터마크 삽입된 영상 파일 다운로드.

    - 등록부 조회 → 워터마크 여부 확인 → 파일 존재 확인 → FileResponse 반환
    - Content-Disposition: attachment 헤더로 강제 다운로드
    - 파일명은 `watermarked_{원본파일명}.mp4` 형태
    """
    info = video_service.get_video_info(video_id)
    if info is None:
        raise DownloadVideoNotFoundError()

    if not info.get("watermark_id"):
        raise DownloadNotWatermarkedError()

    video_uuid = _strip_video_prefix(video_id)
    file_path = settings.WATERMARKED_DIR / f"{video_uuid}.mp4"

    if not file_path.exists():
        raise DownloadVideoNotFoundError()

    try:
        original_name = info.get("original_filename") or f"{video_uuid}.mp4"
        base_name = Path(original_name).stem
        download_name = f"watermarked_{base_name}.mp4"

        return FileResponse(
            path=file_path,
            media_type="video/mp4",
            filename=download_name,
        )
    except Exception:
        raise DownloadError()
