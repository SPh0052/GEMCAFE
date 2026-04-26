from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "temp"

ALLOWED_VIDEO_EXTENSIONS: tuple[str, ...] = (".mp4", ".mov")
ALLOWED_VIDEO_MIME_TYPES: tuple[str, ...] = ("video/mp4", "video/quicktime")


class Settings(BaseSettings):
    APP_NAME: str = "gemmark"
    APP_ENV: str = "development"

    UPLOAD_DIR: Path = DEFAULT_UPLOAD_DIR
    MAX_FILE_SIZE_MB: int = 100

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(case_sensitive=True)


settings = Settings()
