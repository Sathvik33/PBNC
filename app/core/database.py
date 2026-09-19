from datetime import datetime, timezone
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings
from app.core.logging import logger

# Convert standard database URL to async driver if needed
# e.g. postgresql+psycopg:// -> postgresql+psycopg_async:// or use asyncpg/psycopg
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

# Synchronous engine for migrations / Celery workers
sync_engine = create_engine(
    database_url,
    pool_pre_ping=True,
    echo=False
)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

# Async engine for FastAPI
async_db_url = database_url
if async_db_url.startswith("postgresql://"):
    async_db_url = async_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif async_db_url.startswith("postgresql+psycopg://"):
    async_db_url = async_db_url.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)

if "sslmode=require" in async_db_url:
    async_db_url = async_db_url.replace("sslmode=require", "ssl=require")
if "&channel_binding=require" in async_db_url:
    async_db_url = async_db_url.replace("&channel_binding=require", "")
if "?channel_binding=require" in async_db_url:
    async_db_url = async_db_url.replace("?channel_binding=require", "")

if "sqlite" in async_db_url and "aiosqlite" not in async_db_url:
    async_db_url = async_db_url.replace("sqlite://", "sqlite+aiosqlite://")

async_engine = create_async_engine(
    async_db_url,
    pool_pre_ping=True,
    echo=False
)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


async def check_database_connection() -> bool:
    try:
        async with async_engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.warning(f"Database connection check failed: {e}")
        return False
