"""워터마크 삽입 오케스트레이션 서비스.

videoId 조회 → 페이로드 생성 → DCT 삽입 → 결과 저장 → 메타데이터 응답.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import WATERMARK_DEFAULT_DOWNLOADER, settings
from app.core.exceptions import (
    AlreadyWatermarkedError,
    VideoIdMissingError,
    VideoNotFoundError,
    WatermarkEmbedError,
)
from app.schemas.watermark import WatermarkEmbedData
from app.services import video_service
from app.services.watermark.dct import bits_to_hex
from app.services.watermark.payload import make_payload_bits
from app.services.watermark.video import embed_video_file


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

    return WatermarkEmbedData(
        success=True,
        processingTime=stats["processing_time"],
        psnr=stats["psnr"],
        watermarkHex=bits_to_hex(payload),
        contentUuid=video_uuid,
        timestamp=datetime.now(timezone.utc),
    )
