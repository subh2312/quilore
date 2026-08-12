"""Normalized AI gateway response contracts.

All AI invoke paths return this envelope so Spring Boot and the mobile client
can rely on a stable shape. Outputs are always user-editable (never final).
"""

from typing import Any

from pydantic import BaseModel, Field


class NormalizedAIResponse(BaseModel):
    """Canonical AI gateway response after provider routing / fallback."""

    task: str
    provider: str | None = None
    fallback_used: bool = False
    degraded: bool = False
    content: Any | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    message: str
    # Product rule: AI output is never authoritative without user confirmation.
    editable: bool = True
    user_confirmation_required: bool = True


class InvokeRequest(BaseModel):
    """Minimal invoke payload; providers are not called until keys exist."""

    input: dict[str, Any] = Field(default_factory=dict)
    prefer_provider: str | None = None
