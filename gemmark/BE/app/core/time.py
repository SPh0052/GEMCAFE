"""애플리케이션 공통 시간 유틸 (KST 기준)."""

from datetime import datetime

from app.core.config import KST


def now_kst() -> datetime:
    """현재 KST 시각 (timezone-aware)."""
    return datetime.now(KST)


def now_kst_naive() -> datetime:
    """현재 KST 시각 (timezone-naive). MySQL DATETIME 컬럼 호환."""
    return datetime.now(KST).replace(tzinfo=None)
