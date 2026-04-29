"""Redis 클라이언트 (JWT 블랙리스트 저장소)."""

import redis.asyncio as aioredis

from app.core.config import settings


redis_client: aioredis.Redis = aioredis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    encoding="utf-8",
)


async def close_redis() -> None:
    await redis_client.aclose()
