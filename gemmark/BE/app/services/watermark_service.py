"""워터마크 삽입/검증 오케스트레이션 서비스."""

import asyncio
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile

from app.core.config import (
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_VIDEO_MIME_TYPES,
    WATERMARK_BUSINESS_ID,
    WATERMARK_DEFAULT_DOWNLOADER,
    settings,
)
from app.core.exceptions import (
    AlreadyWatermarkedError,
    VerifyUnsupportedFormatError,
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

    # 검증 시 조회용 페이로드 → 메타데이터 매핑 등록
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

_VERIFY_CHUNK_SIZE = 1024 * 1024  # 1 MiB
_VERIFY_BER_THRESHOLD = 0.1


def _validate_verify_file(file: UploadFile | None) -> None:
    if file is None or not file.filename:
        raise VerifyUnsupportedFormatError()
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise VerifyUnsupportedFormatError()
    if file.content_type not in ALLOWED_VIDEO_MIME_TYPES:
        raise VerifyUnsupportedFormatError()


async def _stream_to_temp(file: UploadFile, suffix: str, max_bytes: int) -> Path:
    fd = tempfile.NamedTemporaryFile(prefix="verify_", suffix=suffix, delete=False)
    tmp_path = Path(fd.name)
    written = 0
    try:
        with fd as out:
            while chunk := await file.read(_VERIFY_CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise WatermarkVerifyError()
                out.write(chunk)
    except WatermarkVerifyError:
        tmp_path.unlink(missing_ok=True)
        raise
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise WatermarkVerifyError()

    if written == 0:
        tmp_path.unlink(missing_ok=True)
        raise WatermarkVerifyError()

    return tmp_path


async def verify_watermark(file: UploadFile | None) -> WatermarkVerifyData:
    """입력 영상에서 워터마크를 추출하고 등록부와 매칭."""
    _validate_verify_file(file)
    assert file is not None and file.filename is not None  # narrow type

    suffix = Path(file.filename).suffix.lower()
    tmp_path = await _stream_to_temp(file, suffix, settings.max_file_size_bytes)

    try:
        try:
            extracted_bits, _stats = await asyncio.to_thread(
                extract_video_file,
                tmp_path,
                PAYLOAD_BITS,
                settings.WATERMARK_KEY,
                settings.WATERMARK_ALPHA,
                8,
            )
        except Exception:
            raise WatermarkVerifyError()
    finally:
        tmp_path.unlink(missing_ok=True)

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
