import redis
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger

# Synchronous Redis client (for Celery or synchronous workers)
sync_redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Async Redis client for FastAPI endpoints
async_redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def check_redis_connection() -> bool:
    try:
        await async_redis_client.ping()
        return True
    except Exception as e:
        logger.warning(f"Redis ping failed: {e}")
        return False
