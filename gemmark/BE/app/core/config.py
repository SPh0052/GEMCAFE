from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_UPLOAD_DIR = _PROJECT_ROOT / "uploads" / "temp"
DEFAULT_WATERMARKED_DIR = _PROJECT_ROOT / "uploads" / "watermarked"

ALLOWED_VIDEO_EXTENSIONS: tuple[str, ...] = (".mp4", ".mov")
ALLOWED_VIDEO_MIME_TYPES: tuple[str, ...] = ("video/mp4", "video/quicktime")

WATERMARK_BUSINESS_ID = "gemgem"
WATERMARK_VERSION = "v1 (DCT)"
WATERMARK_ECC = "BCH-33"
WATERMARK_DEFAULT_DOWNLOADER = "u0001"


class Settings(BaseSettings):
    APP_NAME: str = "gemmark"
    APP_ENV: str = "development"

    UPLOAD_DIR: Path = DEFAULT_UPLOAD_DIR
    WATERMARKED_DIR: Path = DEFAULT_WATERMARKED_DIR
    MAX_FILE_SIZE_MB: int = 100

    WATERMARK_ALPHA: float = 20.0
    WATERMARK_KEY: int = 42

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(case_sensitive=True)


settings = Settings()
