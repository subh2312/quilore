"""Application configuration via pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI service configuration — loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ─── Service ─────────────────────────────────────────────
    port: int = 8000

    # ─── Database (read-only access for RAG / embeddings) ────
    database_url: str = "postgresql://quilore:quilore_dev_pass@localhost:5432/quilore"

    # ─── AI Provider API Keys ────────────────────────────────
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    hf_api_token: str = ""
    nvidia_nim_api_key: str = ""


settings = Settings()
