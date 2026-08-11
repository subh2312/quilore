"""Quilore AI Orchestration Service — FastAPI application."""

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI

from app.config import settings
from app.providers.router import router as providers_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    # Startup: log config summary (no secrets)
    print(f"[quilore-ai] Starting on port {settings.port}")
    print(f"[quilore-ai] Groq configured: {bool(settings.groq_api_key)}")
    print(f"[quilore-ai] OpenRouter configured: {bool(settings.openrouter_api_key)}")
    print(f"[quilore-ai] HuggingFace configured: {bool(settings.hf_api_token)}")
    yield
    # Shutdown
    print("[quilore-ai] Shutting down")


app = FastAPI(
    title="Quilore AI Service",
    description="Stateless AI orchestration — provider routing, OCR cleanup, prompt assembly, "
    "embeddings, and food-image pipeline.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(providers_router, prefix="/ai", tags=["AI Providers"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "UP",
        "service": "quilore-ai-service",
        "timestamp": datetime.now(UTC).isoformat(),
    }
