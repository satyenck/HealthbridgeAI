from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT (HIPAA Compliance - 15 minute session timeout)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes for HIPAA compliance

    # Google Gemini AI
    GEMINI_API_KEY: str

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # Agora (Video/Audio Calls)
    AGORA_APP_ID: Optional[str] = None
    AGORA_APP_CERTIFICATE: Optional[str] = None

    # Encryption (HIPAA Compliance - File Encryption)
    ENCRYPTION_KEY: str

    # Redis (Session Management)
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    SESSION_TIMEOUT_SECONDS: int = 900  # 15 minutes

    # App
    APP_NAME: str = "HealthbridgeAI"
    DEBUG: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
