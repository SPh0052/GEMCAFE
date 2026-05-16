"""관리자 인증 서비스 — 로그인/로그아웃/토큰 재발급 비즈니스 로직."""

from datetime import datetime, timezone
from typing import Any

from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    InvalidCredentialsError,
    InvalidTokenError,
    MissingAuthParameterError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.schemas.auth import LoginData, RefreshData
from app.services import admin_service, token_blacklist


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


async def logout(token_payload: dict[str, Any]) -> None:
    """로그아웃 — 토큰의 jti를 블랙리스트에 추가.

    토큰 만료까지 남은 시간을 TTL로 설정 → 만료 후 자동 정리.
    """
    jti = token_payload.get("jti")
    exp = token_payload.get("exp")
    if not jti or not exp:
        return  # jti/exp 없는 토큰은 무시 (예전 형식 호환)

    now_ts = datetime.now(timezone.utc).timestamp()
    ttl_seconds = max(0, int(exp - now_ts))

    await token_blacklist.add(jti, ttl_seconds)


async def refresh_access_token(refresh_token: str | None) -> RefreshData:
    """refresh 토큰으로 새 access 토큰 발급.

    - 토큰 누락/위변조/만료 → AUTH-003 (InvalidTokenError)
    - access 타입(refresh가 아님) → AUTH-003
    - 블랙리스트(로그아웃됨) → AUTH-003
    - 성공 → 새 access 토큰만 발급 (refresh는 그대로)
    """
    if not refresh_token:
        raise InvalidTokenError()

    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise InvalidTokenError()

    if payload.get("type") != "refresh":
        raise InvalidTokenError()

    jti = payload.get("jti")
    if jti and await token_blacklist.is_blacklisted(jti):
        raise InvalidTokenError()

    subject = payload.get("sub")
    if not subject:
        raise InvalidTokenError()

    new_access = create_access_token(subject=subject)

    return RefreshData(
        accessToken=new_access,
        tokenType="Bearer",
        expiresIn=settings.JWT_ACCESS_EXPIRE_MINUTES * 60,
    )
