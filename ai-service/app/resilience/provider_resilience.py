"""Retry, backoff, and circuit-breaker helpers for external AI providers (Story 13.4)."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Callable

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter


class CircuitState(StrEnum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    failure_threshold: int = 3
    recovery_seconds: float = 30.0
    failures: int = 0
    opened_at: float | None = None
    state: CircuitState = CircuitState.CLOSED

    def allow(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN and self.opened_at is not None:
            if time.monotonic() - self.opened_at >= self.recovery_seconds:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return self.state == CircuitState.HALF_OPEN

    def record_success(self) -> None:
        self.failures = 0
        self.state = CircuitState.CLOSED
        self.opened_at = None

    def record_failure(self) -> None:
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.opened_at = time.monotonic()


_breakers: dict[str, CircuitBreaker] = {}


def get_breaker(provider: str) -> CircuitBreaker:
    if provider not in _breakers:
        _breakers[provider] = CircuitBreaker()
    return _breakers[provider]


class ProviderTransientError(Exception):
    """Retryable provider failure."""


def with_retry(fn: Callable[[], Any], *, attempts: int = 3) -> Any:
    """Bounded exponential backoff with jitter via tenacity."""

    @retry(
        reraise=True,
        stop=stop_after_attempt(attempts),
        wait=wait_exponential_jitter(initial=0.1, max=2.0),
        retry=retry_if_exception_type(ProviderTransientError),
    )
    def _inner() -> Any:
        return fn()

    return _inner()


def call_with_resilience(provider: str, fn: Callable[[], Any]) -> dict[str, Any]:
    breaker = get_breaker(provider)
    if not breaker.allow():
        return {
            "ok": False,
            "degraded": True,
            "provider": provider,
            "circuit": breaker.state.value,
            "message": "Provider circuit open — failing fast with graceful degradation.",
        }
    try:
        result = with_retry(fn)
        breaker.record_success()
        return {"ok": True, "degraded": False, "provider": provider, "result": result}
    except Exception as exc:  # noqa: BLE001 — normalize provider failures
        breaker.record_failure()
        return {
            "ok": False,
            "degraded": True,
            "provider": provider,
            "circuit": breaker.state.value,
            "message": f"Provider call failed: {exc}",
        }
