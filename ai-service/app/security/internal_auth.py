"""Internal service authentication for privileged AI service routes."""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.config import settings

_INTERNAL_TOKEN_HEADER = "X-Internal-Token"


def _configured_token() -> str | None:
    token = settings.internal_api_token.strip()
    return token or None


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value:
        return None
    return value.strip() or None


def require_internal_token(
    x_internal_token: str | None = Header(default=None, alias=_INTERNAL_TOKEN_HEADER),
    authorization: str | None = Header(default=None),
) -> None:
    """Fail closed unless the caller presents the configured internal API token."""
    expected = _configured_token()
    if expected is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="internal_api_token_not_configured",
        )

    provided = (x_internal_token or _extract_bearer_token(authorization) or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_internal_api_token",
        )
