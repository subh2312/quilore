"""AI provider routing with priority fallback matrix.

Implements the fallback matrix from docs/quilore_document_set.md §3.6:
  Chat/LLM:    Groq → OpenRouter → HuggingFace
  Vision:      HuggingFace → NVIDIA NIM → OpenRouter
  Embeddings:  Gemini → HuggingFace
  Meal parse:  Groq → OpenRouter → (Spring Boot rule-based)
"""

from enum import StrEnum
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


class TaskType(StrEnum):
    """AI task categories matching the provider fallback matrix."""

    CHAT = "chat"
    VISION = "vision"
    EMBEDDINGS = "embeddings"
    MEAL_PARSE = "meal_parse"
    SEGMENTATION = "segmentation"
    DEPTH_ESTIMATION = "depth_estimation"


# ─── Fallback matrix (§3.6) ─────────────────────────────────
FALLBACK_MATRIX: dict[TaskType, list[str]] = {
    TaskType.CHAT: ["groq", "openrouter", "huggingface"],
    TaskType.VISION: ["huggingface", "nvidia_nim", "openrouter"],
    TaskType.EMBEDDINGS: ["gemini", "huggingface"],
    TaskType.MEAL_PARSE: ["groq", "openrouter"],
    TaskType.SEGMENTATION: ["huggingface"],
    TaskType.DEPTH_ESTIMATION: ["huggingface"],
}


def _provider_available(provider: str) -> bool:
    """Check if a provider's API key is configured."""
    key_map = {
        "groq": settings.groq_api_key,
        "openrouter": settings.openrouter_api_key,
        "huggingface": settings.hf_api_token,
        "nvidia_nim": settings.nvidia_nim_api_key,
        "gemini": "",  # placeholder — will use a separate config when added
    }
    return bool(key_map.get(provider, ""))


class ProviderStatusResponse(BaseModel):
    """Response showing which providers are available for each task type."""

    task: str
    providers: list[dict[str, Any]]


class RouteResponse(BaseModel):
    """Response showing the selected provider for a task."""

    task: str
    selected_provider: str | None
    fallback_chain: list[str]
    message: str


@router.get("/providers/status")
async def provider_status() -> list[ProviderStatusResponse]:
    """List all task types and the availability of their provider chain."""
    result = []
    for task_type, providers in FALLBACK_MATRIX.items():
        result.append(
            ProviderStatusResponse(
                task=task_type.value,
                providers=[
                    {"name": p, "available": _provider_available(p)} for p in providers
                ],
            )
        )
    return result


@router.get("/providers/route/{task_type}")
async def route_task(task_type: TaskType) -> RouteResponse:
    """Resolve the best available provider for a given task type.

    Walks the fallback chain and returns the first provider with a configured key.
    If none are available, returns a graceful degradation message per §2.4.
    """
    chain = FALLBACK_MATRIX.get(task_type, [])
    selected = None
    for provider in chain:
        if _provider_available(provider):
            selected = provider
            break

    if selected:
        return RouteResponse(
            task=task_type.value,
            selected_provider=selected,
            fallback_chain=chain,
            message=f"Routing to {selected}",
        )

    # Graceful degradation (§2.4): return a helpful message instead of an error
    return RouteResponse(
        task=task_type.value,
        selected_provider=None,
        fallback_chain=chain,
        message="No providers configured for this task. "
        "Results will be queued and processed when a provider becomes available.",
    )
