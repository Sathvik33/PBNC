from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "Document Intelligence & Question Extraction Service"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/doc_intelligence"
    DATABASE_URL_POOLED: Optional[str] = None
    TEST_DATABASE_URL: Optional[str] = "sqlite+aiosqlite:///./test.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Security
    JWT_SECRET_KEY: str = "default_secret_key_needs_override_in_env_32_characters_minimum"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Storage
    MAX_FILE_SIZE_MB: int = 25
    STORAGE_TYPE: str = "s3"
    STORAGE_PATH: str = "./storage"
    AWS_ENDPOINT_URL_S3: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: Optional[str] = "ap-southeast-1"
    S3_BUCKET: Optional[str] = "uploads"

    # OCR
    OCR_PROVIDER: str = "tesseract"

    # LLM Settings
    LLM_PROVIDER: str = "groq"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # Cloud LLM Fallback (Optional)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct"

    # Vision Provider (Optional)
    VISION_PROVIDER: Optional[str] = None


settings = Settings()
