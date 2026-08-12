"""Quilore AI Orchestration Service — FastAPI application."""

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response

from app.config import settings
from app.exercises.router import router as exercises_router
from app.nutrition.router import router as nutrition_router
from app.observability.logging import configure_logging, get_logger, job_trace
<<<<<<< HEAD
from app.observability.middleware import (
    ObservabilityMiddleware,
    refresh_provider_health_metrics,
)
=======
from app.observability.middleware import ObservabilityMiddleware, refresh_provider_health_metrics
>>>>>>> origin/cursor
from app.ocr.router import router as ocr_router
from app.pose.router import router as pose_router
from app.prompts.router import router as prompts_router
from app.providers import nim_client
from app.providers.router import router as providers_router
from app.queue.router import router as queue_router
from app.resilience.provider_resilience import get_breaker

configure_logging()
log = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    with job_trace("ai-service-startup"):
<<<<<<< HEAD
        log.info(
            "service_starting",
            port=settings.port,
            nim_configured=nim_client.nim_configured(),
        )
=======
        log.info("service_starting", port=settings.port, nim_configured=nim_client.nim_configured())
>>>>>>> origin/cursor
        if nim_client.nim_configured():
            nim_client.verify_models_at_startup()
        refresh_provider_health_metrics()
    yield
    log.info("service_stopping")


app = FastAPI(title="Quilore AI Service", version="0.1.0", lifespan=lifespan)
app.add_middleware(ObservabilityMiddleware)
app.include_router(providers_router, prefix="/ai", tags=["AI Providers"])
app.include_router(pose_router, prefix="/ai/pose", tags=["Pose"])
app.include_router(exercises_router, prefix="/ai/exercises", tags=["Exercises"])
app.include_router(queue_router, prefix="/ai/queue", tags=["AI Queue"])
app.include_router(ocr_router, prefix="/ai/ocr", tags=["OCR"])
app.include_router(nutrition_router, prefix="/ai/nutrition", tags=["Nutrition AI"])
app.include_router(prompts_router, prefix="/ai/prompts", tags=["Prompts"])


@app.get("/health")
async def health():
    refresh_provider_health_metrics()
    return {
        "status": "UP",
        "service": "quilore-ai-service",
        "timestamp": datetime.now(UTC).isoformat(),
<<<<<<< HEAD
        "circuits": {
            p: get_breaker(p).state.value
            for p in ("groq", "openrouter", "huggingface", "nvidia_nim")
        },
=======
        "circuits": {p: get_breaker(p).state.value for p in ("groq", "openrouter", "huggingface", "nvidia_nim")},
>>>>>>> origin/cursor
    }


@app.get("/metrics")
async def metrics():
    refresh_provider_health_metrics()
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
