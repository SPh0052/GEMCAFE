"""관리자 인증 서비스 — 로그인 비즈니스 로직 (DB 기반)."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import InvalidCredentialsError, MissingAuthParameterError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
)
from app.schemas.auth import LoginData
from app.services import admin_service


async def login(
    db: AsyncSession,
    login_id: str | None,
    password: str | None,
) -> LoginData:
    """관리자 로그인.

    - 입력값 누락 → AUTH-002 (400)
    - 일치 안 함 → AUTH-001 (401)
    - 성공 → access/refresh 토큰 발급
    """
    if not login_id or not password:
        raise MissingAuthParameterError()

    admin = await admin_service.find_by_login_id(db, login_id)
    if admin is None:
        raise InvalidCredentialsError()

    if not verify_password(password, admin.password):
        raise InvalidCredentialsError()

    access = create_access_token(subject=admin.id)
    refresh = create_refresh_token(subject=admin.id)

    return LoginData(
        accessToken=access,
        refreshToken=refresh,
        tokenType="Bearer",
        expiresIn=settings.JWT_ACCESS_EXPIRE_MINUTES * 60,
    )
