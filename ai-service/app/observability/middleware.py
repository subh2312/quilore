"""HTTP middleware: correlation IDs, latency metrics, provider health gauges."""

from __future__ import annotations

import time
from uuid import uuid4

from prometheus_client import Counter, Gauge, Histogram
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.observability.logging import (
    correlation_id_ctx,
    get_logger,
    traceparent_ctx,
)
from app.providers.router import FALLBACK_MATRIX, _provider_available

REQUEST_LATENCY = Histogram(
    "quilore_ai_http_request_duration_seconds",
    "AI service HTTP request latency",
    labelnames=("method", "path", "status"),
)
REQUEST_ERRORS = Counter(
    "quilore_ai_http_errors_total",
    "AI service HTTP 5xx responses",
    labelnames=("method", "path"),
)
PROVIDER_AVAILABLE = Gauge(
    "quilore_ai_provider_available",
    "Whether a configured API key exists for a provider (1/0)",
    labelnames=("provider",),
)


def refresh_provider_health_metrics() -> None:
    providers = {p for chain in FALLBACK_MATRIX.values() for p in chain}
    for provider in providers:
        PROVIDER_AVAILABLE.labels(provider=provider).set(
            1.0 if _provider_available(provider) else 0.0
        )


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = (
            request.headers.get("x-correlation-id")
            or _trace_id_from_traceparent(request.headers.get("traceparent"))
            or str(uuid4())
        )
        traceparent = request.headers.get("traceparent") or (
            f"00-{correlation_id.replace('-', '')}-0000000000000001-01"
        )

        token_c = correlation_id_ctx.set(correlation_id)
        token_t = traceparent_ctx.set(traceparent)
        log = get_logger()
        started = time.perf_counter()
        status_code = 500
        counted_error = False
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["traceparent"] = traceparent
            return response
        except Exception:
            counted_error = True
            log.exception("request_failed", path=request.url.path, method=request.method)
            REQUEST_ERRORS.labels(request.method, request.url.path).inc()
            raise
        finally:
            duration = time.perf_counter() - started
            path = request.url.path
            REQUEST_LATENCY.labels(request.method, path, str(status_code)).observe(duration)
            if status_code >= 500 and not counted_error:
                REQUEST_ERRORS.labels(request.method, path).inc()
            log.info(
                "request_completed",
                method=request.method,
                path=path,
                status=status_code,
                durationMs=round(duration * 1000, 2),
            )
            correlation_id_ctx.reset(token_c)
            traceparent_ctx.reset(token_t)


def _trace_id_from_traceparent(traceparent: str | None) -> str | None:
    if not traceparent:
        return None
    parts = traceparent.strip().split("-")
    if len(parts) >= 2 and len(parts[1]) >= 16:
        return parts[1]
    return None
