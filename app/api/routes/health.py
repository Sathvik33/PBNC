from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_database_connection
from app.core.redis import check_redis_connection
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def get_health():
    db_ok = await check_database_connection()
    redis_ok = await check_redis_connection()

    all_healthy = db_ok and redis_ok
    status_str = "healthy" if all_healthy else "degraded"

    return HealthResponse(
        status=status_str,
        app=settings.APP_NAME,
        environment=settings.APP_ENV,
        services={
            "database": "connected" if db_ok else "disconnected",
            "redis": "connected" if redis_ok else "disconnected",
        }
    )
