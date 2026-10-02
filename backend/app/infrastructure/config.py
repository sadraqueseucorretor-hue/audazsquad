from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./var/audaz.db"
    storage_path: str = "./var/uploads"
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cookie_secure: bool = False
    session_hours: int = 12
    max_upload_mb: int = 20


@lru_cache
def settings() -> Settings:
    return Settings()
