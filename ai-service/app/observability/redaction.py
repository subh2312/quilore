"""Sensitive telemetry redaction policy for the AI service."""

from __future__ import annotations

import re
from typing import Any

_SENSITIVE_KEYS = {
    "password",
    "passwd",
    "secret",
    "token",
    "api_key",
    "apikey",
    "authorization",
    "jwt",
    "refresh_token",
    "access_token",
    "groq_api_key",
    "openrouter_api_key",
    "hf_api_token",
    "nvidia_nim_api_key",
    "internal_api_token",
}

_BEARER = re.compile(r"(?i)(bearer\s+)[a-z0-9._\-]+")
_REDACTED = "[REDACTED]"


def is_sensitive_key(key: str | None) -> bool:
    if not key:
        return False
    normalized = key.lower().replace("-", "_")
    if normalized in _SENSITIVE_KEYS:
        return True
    return any(token in normalized for token in ("password", "secret", "token", "api_key"))


def redact_text(value: str | None) -> str | None:
    if value is None or value == "":
        return value
    return _BEARER.sub(rf"\1{_REDACTED}", value)


def redact_mapping(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not payload:
        return {}
    out: dict[str, Any] = {}
    for key, value in payload.items():
        if is_sensitive_key(key):
            out[key] = _REDACTED
        elif isinstance(value, dict):
            out[key] = redact_mapping(value)
        elif isinstance(value, str):
            out[key] = redact_text(value)
        else:
            out[key] = value
    return out
