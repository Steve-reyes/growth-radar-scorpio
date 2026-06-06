from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/growth_radar.db"
    OPENAI_API_KEY: str = ""
    ISED_API_BASE: str = "https://api.ised-isde.canada.ca"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    APP_NAME: str = "Growth Radar"
    APP_VERSION: str = "0.1.0"

    model_config = {
        "env_file": str(Path(__file__).resolve().parent.parent.parent.parent / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
