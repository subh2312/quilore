"""AI provider routing with priority fallback matrix (NIM primary when configured)."""

import json
from enum import StrEnum
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.providers import nim_client
from app.providers.contracts import InvokeRequest, NormalizedAIResponse
from app.resilience.provider_resilience import call_with_resilience

router = APIRouter()


class TaskType(StrEnum):
    CHAT = "chat"
    VISION = "vision"
    VISION_OCR = "vision_ocr"
    EMBEDDINGS = "embeddings"
    MEAL_PARSE = "meal_parse"
    SEGMENTATION = "segmentation"
    DEPTH_ESTIMATION = "depth_estimation"


FALLBACK_MATRIX: dict[TaskType, list[str]] = {
    TaskType.CHAT: ["nvidia_nim", "groq", "openrouter", "huggingface"],
    TaskType.VISION: ["nvidia_nim", "huggingface", "openrouter"],
    TaskType.VISION_OCR: ["nvidia_nim", "huggingface", "openrouter"],
    TaskType.EMBEDDINGS: ["nvidia_nim", "gemini", "huggingface"],
    TaskType.MEAL_PARSE: ["nvidia_nim", "groq", "openrouter"],
    TaskType.SEGMENTATION: ["huggingface"],
    TaskType.DEPTH_ESTIMATION: ["huggingface"],
}


def _provider_available(provider: str) -> bool:
    key_map = {
        "groq": settings.groq_api_key,
        "openrouter": settings.openrouter_api_key,
        "huggingface": settings.hf_api_token,
        "nvidia_nim": settings.nvidia_nim_api_key,
        "gemini": "",
    }
    return bool(key_map.get(provider, ""))


def _model_for_task(task_type: TaskType, *, escalate: bool = False) -> str:
    if task_type == TaskType.EMBEDDINGS:
        return settings.nim_embed_model
    if task_type in (TaskType.VISION, TaskType.VISION_OCR):
        return settings.nim_ocr_model
    if escalate:
        return settings.nim_escalation_model
    if task_type == TaskType.MEAL_PARSE:
        return settings.nim_coach_alt or settings.nim_coach_model
    return settings.nim_coach_model


def _build_messages(task_type: TaskType, request: InvokeRequest) -> list[dict[str, str]]:
    inp = request.input or {}
    if task_type == TaskType.CHAT:
        system = str(
            inp.get("system") or "You are Quilore's fitness coach. Be concise and actionable."
        )
        user = str(inp.get("prompt") or inp.get("message") or inp.get("q") or "")
        return [{"role": "system", "content": system}, {"role": "user", "content": user}]
    if task_type == TaskType.MEAL_PARSE:
        return [
            {
                "role": "system",
                "content": (
                    "Parse meal descriptions into JSON with dishes[], portions[], editable=true."
                ),
            },
            {"role": "user", "content": str(inp.get("text") or inp.get("prompt") or "")},
        ]
    if task_type in (TaskType.VISION, TaskType.VISION_OCR):
        return [
            {
                "role": "system",
                "content": (
                    "Extract workout or nutrition label text from OCR input. "
                    "Return plain text only."
                ),
            },
            {"role": "user", "content": str(inp.get("text") or inp.get("ocr_text") or "")},
        ]
    return [{"role": "user", "content": str(inp)}]


def _invoke_nim(task_type: TaskType, request: InvokeRequest) -> dict[str, Any]:
    escalate = bool(request.input.get("escalate")) if request.input else False
    model = _model_for_task(task_type, escalate=escalate)

    if task_type == TaskType.EMBEDDINGS:
        text = str(request.input.get("text") or request.input.get("input") or "")
        embedded = nim_client.embed_texts([text], model=model)
        if not embedded.get("ok"):
            raise RuntimeError(embedded.get("message", "embedding failed"))
        vector = embedded["vectors"][0] if embedded["vectors"] else []
        return {"embedding": vector, "dimensions": len(vector), "model": model}

    messages = _build_messages(task_type, request)
    completion = nim_client.chat_completion(
        model=model,
        messages=messages,
        max_tokens=int(request.input.get("max_tokens", 1024)) if request.input else 1024,
    )
    if not completion.get("ok"):
        raise RuntimeError(completion.get("message", "chat completion failed"))
    text = completion.get("text") or ""
    safety = nim_client.safety_check(text)
    filtered = safety.get("filteredText", text)

    if task_type == TaskType.CHAT:
        return {"reply": filtered, "model": model, "safety": safety}
    if task_type == TaskType.MEAL_PARSE:
        try:
            content = (
                json.loads(filtered) if filtered.strip().startswith("{") else {"raw": filtered}
            )
        except Exception:
            content = {"raw": filtered, "parseError": True}
        return {"result": content, "safety": safety, "editable": True}
    return {"text": filtered, "model": model, "safety": safety}


def _heuristic_content(task_type: TaskType, request: InvokeRequest) -> dict[str, Any]:
    inp = request.input or {}
    if task_type == TaskType.CHAT:
        prompt = str(inp.get("prompt") or inp.get("message") or inp.get("q") or "")
        snippet = prompt[:200] if prompt else "your goal"
        return {
            "reply": (
                f"[Heuristic coach draft — no live provider] "
                f"Review this starter guidance for: {snippet}."
            ),
            "source": "heuristic_v1",
        }
    if task_type in (TaskType.VISION, TaskType.VISION_OCR):
        return {
            "text": str(inp.get("text") or inp.get("ocr_text") or ""),
            "source": "passthrough_heuristic",
        }
    if task_type == TaskType.EMBEDDINGS:
        return {"embedding": [], "dimensions": 0, "source": "heuristic_empty"}
    if task_type == TaskType.MEAL_PARSE:
        return {"dishes": [], "raw": str(inp.get("text") or ""), "source": "heuristic_empty"}
    return {"status": "heuristic_stub", "task": task_type.value}


class ProviderStatusResponse(BaseModel):
    task: str
    providers: list[dict[str, Any]]


class RouteResponse(BaseModel):
    task: str
    selected_provider: str | None
    fallback_chain: list[str]
    message: str


@router.get("/providers/status")
async def provider_status() -> list[ProviderStatusResponse]:
    result = []
    for task_type, providers in FALLBACK_MATRIX.items():
        result.append(
            ProviderStatusResponse(
                task=task_type.value,
                providers=[{"name": p, "available": _provider_available(p)} for p in providers],
            )
        )
    return result


@router.get("/providers/route/{task_type}")
async def route_task(task_type: TaskType) -> RouteResponse:
    chain = FALLBACK_MATRIX.get(task_type, [])
    selected = next((p for p in chain if _provider_available(p)), None)
    if selected:
        return RouteResponse(
            task=task_type.value,
            selected_provider=selected,
            fallback_chain=chain,
            message=f"Routing to {selected}",
        )
    return RouteResponse(
        task=task_type.value,
        selected_provider=None,
        fallback_chain=chain,
        message="No providers configured for this task. Heuristic fallback will be used.",
    )


def _normalize_result(
    task_type: TaskType,
    *,
    provider: str | None,
    chain: list[str],
    content: Any | None,
    message: str,
    degraded: bool,
    confidence: float | None = None,
) -> NormalizedAIResponse:
    fallback_used = bool(provider and chain and provider != chain[0])
    return NormalizedAIResponse(
        task=task_type.value,
        provider=provider,
        fallback_used=fallback_used,
        degraded=degraded,
        content=content,
        confidence=confidence if confidence is not None else (None if degraded else 0.75),
        message=message,
        editable=True,
        user_confirmation_required=True,
    )


@router.post("/tasks/{task_type}/invoke", response_model=NormalizedAIResponse)
async def invoke_task(
    task_type: TaskType,
    body: InvokeRequest | None = None,
) -> NormalizedAIResponse:
    request = body or InvokeRequest()
    chain = FALLBACK_MATRIX.get(task_type, [])
    prefer = request.prefer_provider
    ordered = ([prefer] + [p for p in chain if p != prefer]) if prefer else chain

    last_error: str | None = None
    for provider in ordered:
        if not _provider_available(provider):
            continue
        if provider != "nvidia_nim":
            last_error = f"{provider} adapter not wired"
            continue
        try:
            result = call_with_resilience(provider, lambda: _invoke_nim(task_type, request))
            if result.get("ok"):
                return _normalize_result(
                    task_type,
                    provider=provider,
                    chain=chain,
                    content=result["result"],
                    message="AI inference completed — review and edit before save.",
                    degraded=False,
                )
            last_error = str(result.get("message", "provider failed"))
        except Exception as exc:
            last_error = str(exc)

    content = _heuristic_content(task_type, request)
    if last_error:
        content["last_error"] = last_error
    return _normalize_result(
        task_type,
        provider=None,
        chain=chain,
        content=content,
        message="Heuristic fallback — no live provider available. Review before save.",
        degraded=True,
    )
