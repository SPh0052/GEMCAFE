import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Final

from fastapi import UploadFile

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
from app.schemas.video import VideoUploadData


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
