"""인증/보안 유틸리티 — 비밀번호 해싱 + JWT 토큰 생성/검증/블랙리스트."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import InvalidTokenError


_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer_scheme = HTTPBearer(auto_error=False)


# ──────────────────────────────────────────────────────
# 비밀번호 해싱
# ──────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


# ──────────────────────────────────────────────────────
# JWT 토큰 발급
# ──────────────────────────────────────────────────────
def _generate_jti() -> str:
    return uuid.uuid4().hex


def create_access_token(subject: str | int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(subject),
        "iat": datetime.now(timezone.utc),
        "exp": expire,
        "type": "access",
        "jti": _generate_jti(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str | int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "iat": datetime.now(timezone.utc),
        "exp": expire,
        "type": "refresh",
        "jti": _generate_jti(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """JWT 토큰 디코딩 (서명/만료 검증 포함). 실패 시 JWTError."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


# ──────────────────────────────────────────────────────
# verify_token (FastAPI Dependency)
# ──────────────────────────────────────────────────────
async def verify_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict[str, Any]:
    """Authorization 헤더에서 access token 검증.

    - 헤더 누락/형식 오류 → AUTH-003
    - 서명/만료 위반 → AUTH-003
    - access 토큰 아님 → AUTH-003
    - 블랙리스트(로그아웃됨) → AUTH-003

    성공 시 토큰 페이로드 반환 (sub, jti, exp 등 포함).
    """
    # 지연 import — 순환 참조 방지
    from app.services.token_blacklist import is_blacklisted

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise InvalidTokenError()

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except JWTError:
        raise InvalidTokenError()

    if payload.get("type") != "access":
        raise InvalidTokenError()

    jti = payload.get("jti")
    if jti and await is_blacklisted(jti):
        raise InvalidTokenError()

    return payload


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "verify_token",
    "JWTError",
]
