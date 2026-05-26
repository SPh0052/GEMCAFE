from datetime import timedelta, timezone
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


# 한국 표준시 (UTC+9). 응답/저장용 timestamp 통일에 사용.
KST = timezone(timedelta(hours=9))


_PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_UPLOAD_DIR = _PROJECT_ROOT / "uploads" / "temp"
DEFAULT_WATERMARKED_DIR = _PROJECT_ROOT / "uploads" / "watermarked"

ALLOWED_VIDEO_EXTENSIONS: tuple[str, ...] = (".mp4", ".mov", ".avi", ".mkv")
ALLOWED_VIDEO_MIME_TYPES: tuple[str, ...] = (
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
)

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

    WATERMARK_ALPHA: float = 40.0
    WATERMARK_KEY: int = 42
    # gemcafe → gemmark embed-from-path 호출 시 video_watermarked.admin_id 로 기록할 시스템 admin id.
    # 사전에 admin 테이블에 해당 id 의 system 계정이 존재해야 함.
    WATERMARK_SYSTEM_ADMIN_ID: int = 1

    # JWT 인증
    JWT_SECRET: str = Field(..., min_length=32)  # 검증도 같이 가능
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60      # 1시간
    JWT_REFRESH_EXPIRE_DAYS: int = 7         # 7일

    # 초기 관리자 (DB에 admin 행이 없을 때 자동 생성)
    DEFAULT_ADMIN_LOGIN_ID: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin1234"
    DEFAULT_ADMIN_NAME: str = "관리자"

    # DB 연결
    DATABASE_URL: str = Field(...)
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600  # 1시간 (MySQL wait_timeout 회피)

    # Redis (JWT 블랙리스트)
    REDIS_URL: str = Field(...)

    # RabbitMQ (메시지 큐)
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
