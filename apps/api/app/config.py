"""Application settings loaded from environment."""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict

_env_file = os.getenv("ENV_FILE", ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/expense_manager"
    )
    test_database_url: str | None = None

    @property
    def async_database_url(self) -> str:
        return self.database_url

    @property
    def sync_database_url(self) -> str:
        """URL for Alembic (sync driver)."""
        return self.database_url.replace("postgresql+asyncpg://", "postgresql://", 1)


def get_settings() -> Settings:
    return Settings()
