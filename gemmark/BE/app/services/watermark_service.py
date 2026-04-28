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
from app.core.exceptions import (
    AlreadyWatermarkedError,
    VerifyVideoIdMissingError,
    VerifyVideoNotFoundError,
    VideoIdMissingError,
    VideoNotFoundError,
    WatermarkEmbedError,
    WatermarkVerifyError,
)
from app.schemas.watermark import WatermarkEmbedData, WatermarkVerifyData
from app.services import video_service
from app.services.watermark.dct import bits_to_hex
from app.services.watermark.payload import PAYLOAD_BITS, make_payload_bits
from app.services.watermark.video import embed_video_file, extract_video_file


_VERIFY_BER_THRESHOLD = 0.1


def _strip_video_prefix(video_id: str) -> str:
    return video_id[2:] if video_id.startswith("v_") else video_id


async def embed_watermark(
    video_id: str | None,
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
            settings.WATERMARK_ALPHA,
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


async def verify_watermark(video_id: str | None) -> WatermarkVerifyData:
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

    if metadata is None:
        return WatermarkVerifyData(
            isWatermarked=False,
            videoUuid=None,
            businessId=None,
            createdAt=None,
            ber=None,
        )

    return WatermarkVerifyData(
        isWatermarked=True,
        videoUuid=metadata["videoUuid"],
        businessId=metadata["businessId"],
        createdAt=metadata["createdAt"],
        ber=round(best_ber, 4),
    )
