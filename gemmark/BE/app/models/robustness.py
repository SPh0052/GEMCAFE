import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class RobustnessTestStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class RobustnessAttackType(Base):
    """강건성 공격 유형 마스터 (DB: robustness_attack_type)."""

    __tablename__ = "robustness_attack_type"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    type_name: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class RobustnessTest(Base):
    """강건성 테스트 실행 메타 (DB: robustness_test)."""

    __tablename__ = "robustness_test"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("admin.id"), nullable=False
    )
    filter_start_at: Mapped[date] = mapped_column(Date, nullable=False)
    filter_end_at: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[RobustnessTestStatus] = mapped_column(
        SQLEnum(RobustnessTestStatus), nullable=False
    )
    total_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fail_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_ber: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_psnr: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_duration: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    admin = relationship("Admin", foreign_keys=[admin_id])


class RobustnessTestVideo(Base):
    """영상별 강건성 테스트 결과 (DB: robustness_test_video)."""

    __tablename__ = "robustness_test_video"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    robustness_test_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("robustness_test.id"), nullable=False
    )
    video_watermarked_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("video_watermarked.id"), nullable=False
    )
    avg_ber: Mapped[float] = mapped_column(Float, nullable=False)
    avg_psnr: Mapped[float] = mapped_column(Float, nullable=False)
    avg_duration: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    robustness_test = relationship("RobustnessTest", foreign_keys=[robustness_test_id])
    video_watermarked = relationship(
        "VideoWatermarked", foreign_keys=[video_watermarked_id]
    )


class RobustnessAttackDetail(Base):
    """영상×공격 단위 강건성 결과 상세 (DB: robustness_attack_detail).

    복합 PK: (robustness_test_video_id, attack_type_id). 별도 id 컬럼 없음.
    """

    __tablename__ = "robustness_attack_detail"

    robustness_test_video_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("robustness_test_video.id"),
        primary_key=True,
    )
    attack_type_id: Mapped[str] = mapped_column(
        String(20),
        ForeignKey("robustness_attack_type.id"),
        primary_key=True,
    )
    ber: Mapped[float] = mapped_column(Float, nullable=False)
    psnr: Mapped[float] = mapped_column(Float, nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    robustness_test_video = relationship(
        "RobustnessTestVideo", foreign_keys=[robustness_test_video_id]
    )
    attack_type = relationship(
        "RobustnessAttackType", foreign_keys=[attack_type_id]
    )
