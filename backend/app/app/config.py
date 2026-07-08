from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/growth_radar.db"
    OPENAI_API_KEY: str = ""
    ISED_API_BASE: str = "https://api.ised-isde.canada.ca"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    JWT_SECRET: str = "growth-radar-secret-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 72
    APP_NAME: str = "Growth Radar"
    APP_VERSION: str = "0.2.0"

    model_config = {
        "env_file": str(Path(__file__).resolve().parent.parent.parent.parent / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
