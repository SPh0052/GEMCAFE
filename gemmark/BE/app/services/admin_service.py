"""관리자 정보 조회/생성 서비스 (DB 기반)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.admin import Admin


async def find_by_login_id(db: AsyncSession, login_id: str) -> Admin | None:
    """admin_id(loginId)로 관리자 조회."""
    result = await db.execute(
        select(Admin).where(Admin.admin_id == login_id)
    )
    return result.scalar_one_or_none()


async def find_by_id(db: AsyncSession, admin_id: int) -> Admin | None:
    """PK로 관리자 조회 (JWT subject 검증용)."""
    return await db.get(Admin, admin_id)


async def ensure_default_admin(db: AsyncSession) -> None:
    """초기 관리자가 DB에 없으면 settings 기본값으로 생성.

    운영에서는 환경변수로 비밀번호 override 권장.
    """
    existing = await find_by_login_id(db, settings.DEFAULT_ADMIN_LOGIN_ID)
    if existing is not None:
        return

    admin = Admin(
        admin_id=settings.DEFAULT_ADMIN_LOGIN_ID,
        password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
        name=settings.DEFAULT_ADMIN_NAME,
    )
    db.add(admin)
    await db.commit()
