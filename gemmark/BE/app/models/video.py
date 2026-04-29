from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class VideoWatermarked(Base):
    """워터마크 삽입된 영상 (DB: video_watermarked 테이블 매핑)."""

    __tablename__ = "video_watermarked"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("admin.id"), nullable=False
    )
    content_uuid: Mapped[str] = mapped_column(String(255), nullable=False)
    watermark_hex: Mapped[str] = mapped_column(String(8), nullable=False)
    alpha: Mapped[int] = mapped_column(Integer, nullable=False)
    original_file_name: Mapped[str] = mapped_column(String(100), nullable=False)
    stored_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    thumbnail_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_sec: Mapped[float] = mapped_column(Float, nullable=False)
    embed_psnr: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # relationship (선택)
    admin = relationship("Admin", foreign_keys=[admin_id])
