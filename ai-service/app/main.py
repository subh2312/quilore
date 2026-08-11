"""Quilore AI Orchestration Service — FastAPI application."""

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response

from app.config import settings
from app.observability.logging import configure_logging, get_logger, job_trace
from app.observability.middleware import (
    ObservabilityMiddleware,
    refresh_provider_health_metrics,
)
from app.providers.router import router as providers_router

configure_logging()
log = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    with job_trace("ai-service-startup"):
        log.info(
            "service_starting",
            port=settings.port,
            groq_configured=bool(settings.groq_api_key),
            openrouter_configured=bool(settings.openrouter_api_key),
            huggingface_configured=bool(settings.hf_api_token),
        )
        refresh_provider_health_metrics()
    yield
    log.info("service_stopping")


app = FastAPI(
    title="Quilore AI Service",
    description="Stateless AI orchestration — provider routing, OCR cleanup, prompt assembly, "
    "embeddings, and food-image pipeline.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(ObservabilityMiddleware)
app.include_router(providers_router, prefix="/ai", tags=["AI Providers"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    refresh_provider_health_metrics()
    return {
        "status": "UP",
        "service": "quilore-ai-service",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics scrape endpoint."""
    refresh_provider_health_metrics()
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
