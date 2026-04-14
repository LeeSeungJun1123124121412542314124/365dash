from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # DB
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/365dash"

    # JWT
    JWT_SECRET: str = "change-me"
    JWT_EXPIRE_MINUTES: int = 480
    JWT_ALGORITHM: str = "HS256"

    # CORS (로컬 개발용, 운영에서는 빈 문자열)
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        if not self.CORS_ORIGINS:
            return []
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
