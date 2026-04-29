import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Final

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_VIDEO_MIME_TYPES,
    settings,
)
from app.core.exceptions import (
    CorruptedFileError,
    FileNotAttachedError,
    FileSizeExceededError,
    FileUploadError,
    UnsupportedFileFormatError,
)
from app.models.video import VideoWatermarked
from app.schemas.video import VideoListData, VideoListItem, VideoUploadData


CHUNK_SIZE: Final[int] = 1024 * 1024  # 1 MiB


# 업로드된 영상의 메타데이터 등록부 (in-memory)
# TODO: 영구 저장(DB)으로 교체 예정.
_video_registry: dict[str, dict] = {}


def register_video(
    video_id: str,
    file_path: Path,
    original_filename: str,
    mime_type: str,
    uploaded_at: datetime,
) -> None:
    _video_registry[video_id] = {
        "video_id": video_id,
        "file_path": str(file_path),
        "original_filename": original_filename,
        "mime_type": mime_type,
        "uploaded_at": uploaded_at,
        "watermark_id": None,
    }


def get_video_info(video_id: str) -> dict | None:
    return _video_registry.get(video_id)


def is_watermarked(video_id: str) -> bool:
    info = _video_registry.get(video_id)
    return info is not None and info.get("watermark_id") is not None


def mark_watermarked(video_id: str, watermark_id: str) -> bool:
    info = _video_registry.get(video_id)
    if info is None:
        return False
    info["watermark_id"] = watermark_id
    return True


# 워터마크 페이로드 → 메타데이터 매핑 (검증 시 조회용)
_watermark_payload_registry: dict[str, dict] = {}


def register_watermark_metadata(
    payload_hex: str,
    video_uuid: str,
    business_id: str,
    created_at: datetime,
) -> None:
    _watermark_payload_registry[payload_hex] = {
        "videoUuid": video_uuid,
        "businessId": business_id,
        "createdAt": created_at,
    }


def find_matching_watermark(
    extracted_bits,
    ber_threshold: float = 0.1,
) -> tuple[dict | None, float]:
    """추출된 비트와 가장 BER이 낮은 등록 페이로드 검색.

    Returns:
        (metadata, best_ber):
            매칭 발견 (best_ber <= threshold) → metadata 반환
            매칭 실패 → metadata=None, best_ber=발견된 최저값(또는 1.0)
    """
    from app.services.watermark.dct import hex_to_bits
    from app.services.watermark.metrics import ber as calc_ber

    best_metadata: dict | None = None
    best_ber = 1.0

    for payload_hex, metadata in _watermark_payload_registry.items():
        stored_bits = hex_to_bits(payload_hex)
        current_ber = calc_ber(stored_bits, extracted_bits)
        if current_ber < best_ber:
            best_ber = current_ber
            best_metadata = metadata

    if best_metadata is not None and best_ber <= ber_threshold:
        return best_metadata, best_ber
    return None, best_ber


def _validate_file_attached(file: UploadFile | None) -> None:
    if file is None or not file.filename:
        raise FileNotAttachedError()


def _validate_extension(filename: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise UnsupportedFileFormatError()


def _validate_mime_type(content_type: str | None) -> None:
    if content_type not in ALLOWED_VIDEO_MIME_TYPES:
        raise UnsupportedFileFormatError()


async def _stream_to_disk(
    file: UploadFile, dest: Path, max_bytes: int
) -> int:
    written = 0
    try:
        with dest.open("wb") as out:
            while chunk := await file.read(CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise FileSizeExceededError()
                out.write(chunk)
    except FileSizeExceededError:
        dest.unlink(missing_ok=True)
        raise
    except FileUploadError:
        dest.unlink(missing_ok=True)
        raise
    except Exception:
        dest.unlink(missing_ok=True)
        raise FileUploadError()

    if written == 0:
        dest.unlink(missing_ok=True)
        raise CorruptedFileError()

    return written


async def list_watermarked_videos(
    db: AsyncSession,
    admin_id: int,
    page: int,
    size: int,
) -> VideoListData:
    """본인이 만든 워터마크 영상 목록 조회 (최신순, soft-delete 제외)."""
    base = select(VideoWatermarked).where(
        VideoWatermarked.admin_id == admin_id,
        VideoWatermarked.deleted_at.is_(None),
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
            name=row.original_file_name,
            type=row.file_type,
            size=row.file_size,
            createdAt=row.created_at,
        )
        for row in rows
    ]

    return VideoListData(items=items, total=total, page=page, size=size)


async def upload_video(file: UploadFile | None) -> VideoUploadData:
    """영상 파일을 검증하고 임시 디렉토리에 저장한다.

    S14P31S307-172 (업로드) + S14P31S307-173 (유효성 검증) 통합 처리.
    """
    _validate_file_attached(file)
    assert file is not None and file.filename is not None  # narrow type for mypy

    _validate_extension(file.filename)
    _validate_mime_type(file.content_type)

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    video_id = f"v_{uuid.uuid4()}"
    ext = Path(file.filename).suffix.lower()
    dest = settings.UPLOAD_DIR / f"{video_id}{ext}"

    file_size = await _stream_to_disk(file, dest, settings.max_file_size_bytes)

    uploaded_at = datetime.now(timezone.utc)
    register_video(
        video_id=video_id,
        file_path=dest,
        original_filename=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_at=uploaded_at,
    )

    return VideoUploadData(
        videoId=video_id,
        originalFilename=file.filename,
        fileSize=file_size,
        mimeType=file.content_type or "application/octet-stream",
        uploadedAt=uploaded_at,
    )
