"""JWT 토큰 블랙리스트 — Redis 기반.

로그아웃된 토큰의 jti를 Redis에 저장.
TTL = 토큰의 남은 만료 시간 → 만료된 토큰은 자동 삭제됨.
"""

from app.core.redis import redis_client


_KEY_PREFIX = "blacklist:jti:"


async def add(jti: str, ttl_seconds: int) -> None:
    """jti를 블랙리스트에 추가. ttl 만료 시 자동 삭제."""
    if ttl_seconds <= 0:
        return  # 이미 만료된 토큰은 추가 불필요
    await redis_client.setex(f"{_KEY_PREFIX}{jti}", ttl_seconds, "1")


async def is_blacklisted(jti: str) -> bool:
    """jti가 블랙리스트에 있는지 확인."""
    return bool(await redis_client.exists(f"{_KEY_PREFIX}{jti}"))
