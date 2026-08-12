"""NVIDIA NIM OpenAI-compatible client for coach, OCR, embeddings, and safety."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.config import settings
from app.observability.logging import get_logger
from app.resilience.provider_resilience import call_with_resilience

NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MAX_TOKENS = 1024

log = get_logger()


def nim_configured() -> bool:
    return bool(settings.nvidia_nim_api_key)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.nvidia_nim_api_key}",
        "Content-Type": "application/json",
    }


def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{NIM_BASE_URL}{path}"
    with httpx.Client(timeout=60.0) as client:
        if method == "GET":
            response = client.get(url, headers=_headers())
        else:
            response = client.post(url, headers=_headers(), json=payload or {})
        if response.status_code >= 500:
            raise RuntimeError(f"NIM upstream {response.status_code}")
        if response.status_code >= 400:
            raise ValueError(f"NIM rejected request: {response.status_code} {response.text[:200]}")
        return response.json()


def verify_models_at_startup() -> None:
    """Best-effort model catalog probe at startup; logs warnings only."""
    if not nim_configured():
        return

    def _call() -> dict[str, Any]:
        return _request("GET", "/models")

    wrapped = call_with_resilience("nvidia_nim", _call)
    if wrapped.get("ok"):
        data = wrapped["result"]
        ids = [m.get("id", "") for m in data.get("data", [])[:5]]
        log.info("nim_models_verified", sample=ids)
    else:
        log.warning("nim_models_verify_skipped", reason=wrapped.get("message"))


def chat_completion(
    *,
    messages: list[dict[str, str]],
    model: str | None = None,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    temperature: float = 0.4,
) -> dict[str, Any]:
    model_id = model or settings.nim_coach_model

    def _call() -> dict[str, Any]:
        return _request(
            "POST",
            "/chat/completions",
            {
                "model": model_id,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )

    wrapped = call_with_resilience("nvidia_nim", _call)
    if not wrapped.get("ok"):
        return {"ok": False, "degraded": True, "message": wrapped.get("message"), "text": None}
    data = wrapped["result"]
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {"ok": True, "degraded": False, "text": text, "model": model_id, "raw": data}


def embed_texts(texts: list[str], model: str | None = None) -> dict[str, Any]:
    model_id = model or settings.nim_embed_model

    def _call() -> dict[str, Any]:
        return _request(
            "POST",
            "/embeddings",
            {"model": model_id, "input": texts, "encoding_format": "float"},
        )

    wrapped = call_with_resilience("nvidia_nim", _call)
    if not wrapped.get("ok"):
        return {"ok": False, "degraded": True, "vectors": []}
    data = wrapped["result"]
    vectors = [item.get("embedding", []) for item in data.get("data", [])]
    return {"ok": True, "degraded": False, "vectors": vectors, "model": model_id}


def safety_check(text: str, model: str | None = None) -> dict[str, Any]:
    """Run content-safety model; on failure allow text through with advisory flag."""
    model_id = model or settings.nim_safety_model
    if not nim_configured():
        return {"ok": True, "safe": True, "degraded": True, "filteredText": text}

    result = chat_completion(
        messages=[
            {
                "role": "system",
                "content": "You are a content safety filter. Reply JSON only: "
                '{"safe":true,"reason":""} or {"safe":false,"reason":"..."}',
            },
            {"role": "user", "content": text[:4000]},
        ],
        model=model_id,
        max_tokens=128,
        temperature=0.0,
    )
    if not result.get("ok") or not result.get("text"):
        return {"ok": True, "safe": True, "degraded": True, "filteredText": text}
    try:
        parsed = json.loads(result["text"])
        safe = bool(parsed.get("safe", True))
        return {
            "ok": True,
            "safe": safe,
            "degraded": False,
            "reason": parsed.get("reason", ""),
            "filteredText": text if safe else "[Content filtered — please rephrase]",
        }
    except json.JSONDecodeError:
        return {"ok": True, "safe": True, "degraded": True, "filteredText": text}


def coach_reply(prompt: str, *, escalate: bool = False) -> dict[str, Any]:
    model = settings.nim_escalation_model if escalate else settings.nim_coach_model
    system = (
        "You are Quilore fitness coach. Suggest workouts and nutrition tweaks. "
        "Never diagnose injuries — use risk-flag language. Output stays user-editable."
    )
    result = chat_completion(
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        model=model,
    )
    if result.get("ok") and result.get("text"):
        safety = safety_check(result["text"])
        return {
            **result,
            "text": safety.get("filteredText", result["text"]),
            "safety": safety,
        }
    return result


def map_ocr_with_llm(text: str) -> dict[str, Any]:
    """Map OCR text to workout JSON via OCR model; caller applies regex fallback."""
    if not nim_configured():
        return {"ok": False, "degraded": True}

    schema_hint = (
        'Return JSON only: {"exercises":[{"name":"","sets":0,"reps":0,"load":null,"unit":"kg"}],'
        '"unresolved":[{"raw":"","confidence":0.2}]}'
    )
    result = chat_completion(
        messages=[
            {"role": "system", "content": f"Map workout OCR lines to schema. {schema_hint}"},
            {"role": "user", "content": text[:8000]},
        ],
        model=settings.nim_ocr_model,
        max_tokens=2048,
    )
    if not result.get("ok") or not result.get("text"):
        return {"ok": False, "degraded": True}
    raw = result["text"].strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return {"ok": False, "degraded": True}
    try:
        parsed = json.loads(match.group(0))
        return {"ok": True, "degraded": False, "schema": parsed}
    except json.JSONDecodeError:
        return {"ok": False, "degraded": True}


def food_quality_with_llm(dishes: list[str], notes: str | None) -> dict[str, Any]:
    if not nim_configured():
        return {"ok": False, "degraded": True}
    dish_line = ", ".join(dishes) or "unknown meal"
    prompt = f"Dishes: {dish_line}. Notes: {notes or 'none'}. Give 1-2 advisory food-quality tips."
    result = chat_completion(
        messages=[
            {
                "role": "system",
                "content": "Advisory nutrition feedback only — not medical. JSON: "
                '{"suggestions":["..."],"flaggedDishes":[]}',
            },
            {"role": "user", "content": prompt},
        ],
        model=settings.nim_coach_model,
        max_tokens=512,
    )
    if not result.get("ok") or not result.get("text"):
        return {"ok": False, "degraded": True}
    match = re.search(r"\{.*\}", result["text"], re.DOTALL)
    if not match:
        return {"ok": False, "degraded": True}
    try:
        parsed = json.loads(match.group(0))
        safety = safety_check(json.dumps(parsed))
        return {"ok": True, "degraded": False, "feedback": parsed, "safety": safety}
    except json.JSONDecodeError:
        return {"ok": False, "degraded": True}
