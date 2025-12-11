import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "EventHorizon API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "changeme-secret-key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ALGORITHM: str = "HS256"
    
    # Email
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    MAIL_FROM_EMAIL: str = os.getenv("MAIL_FROM_EMAIL", "noreply@eventhorizon.app")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "EventHorizon")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Database
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "eventhorizon")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    # S3 / Storage (avatars, assets)
    AWS_DEFAULT_REGION: str = os.getenv("AWS_DEFAULT_REGION", "eu-west-1")
    STORAGE_BUCKET: str = os.getenv("AWS_STORAGE_BUCKET") or os.getenv("AVATAR_BUCKET", "")
    STORAGE_BUCKET_BASE_URL: str = os.getenv("AWS_STORAGE_BUCKET_BASE_URL") or os.getenv("AVATAR_BUCKET_BASE_URL", "")
    AVATAR_MAX_SIZE_MB: int = int(os.getenv("AVATAR_MAX_SIZE_MB", "5"))
    AVATAR_ALLOWED_MIME: List[str] = ["image/png", "image/jpeg", "image/webp", "image/avif"]
    # Backwards compatibility for existing callers
    AVATAR_BUCKET: str = STORAGE_BUCKET
    AVATAR_BUCKET_BASE_URL: str = STORAGE_BUCKET_BASE_URL
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
