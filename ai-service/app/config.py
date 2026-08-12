"""Application configuration via pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    port: int = 8000
    database_url: str = "postgresql://quilore:quilore_dev_pass@localhost:5432/quilore"
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    hf_api_token: str = ""
    nvidia_nim_api_key: str = ""
    nim_coach_model: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    nim_coach_alt: str = "google/gemma-4-31b-it"
    nim_escalation_model: str = "zhipuai/glm-5.2"
    nim_ocr_model: str = "nvidia/nemotron-ocr-v2"
    nim_embed_model: str = "nvidia/nemotron-3-embed-1b"
    nim_safety_model: str = "nvidia/nemotron-3.5-content-safety"
settings = Settings()
