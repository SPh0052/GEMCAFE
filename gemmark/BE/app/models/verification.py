import enum
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Integer,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.core.time import now_kst_naive


class VerificationStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    NOT_DETECTED = "NOT_DETECTED"
    PROCESSING = "PROCESSING"


class VerificationHistory(Base):
    """워터마크 검증 이력 (DB: verification_history 테이블 매핑)."""

    __tablename__ = "verification_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_watermarked_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("video_watermarked.id"),
        nullable=True,
    )
    admin_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("admin.id"),
        nullable=False,
    )
    status: Mapped[VerificationStatus] = mapped_column(
        SQLEnum(VerificationStatus),
        nullable=False,
    )
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    extract_duration: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=now_kst_naive
    )

    admin = relationship("Admin", foreign_keys=[admin_id])
    video_watermarked = relationship("VideoWatermarked", foreign_keys=[video_watermarked_id])
