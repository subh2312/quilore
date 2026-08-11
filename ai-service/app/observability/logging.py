"""Structured logging helpers with correlation / job context."""

from __future__ import annotations

import logging
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from uuid import uuid4

import structlog

from app.observability.redaction import redact_mapping

correlation_id_ctx: ContextVar[str | None] = ContextVar("correlation_id", default=None)
traceparent_ctx: ContextVar[str | None] = ContextVar("traceparent", default=None)
job_id_ctx: ContextVar[str | None] = ContextVar("job_id", default=None)
job_name_ctx: ContextVar[str | None] = ContextVar("job_name", default=None)


def _add_context(
    logger: logging.Logger, method_name: str, event_dict: dict
) -> dict:  # noqa: ARG001
    if correlation_id_ctx.get():
        event_dict["correlationId"] = correlation_id_ctx.get()
    if traceparent_ctx.get():
        event_dict["traceparent"] = traceparent_ctx.get()
    if job_id_ctx.get():
        event_dict["jobId"] = job_id_ctx.get()
    if job_name_ctx.get():
        event_dict["jobName"] = job_name_ctx.get()
    event_dict["service"] = "quilore-ai-service"
    return event_dict


def _redact_event(
    logger: logging.Logger, method_name: str, event_dict: dict
) -> dict:  # noqa: ARG001
    return redact_mapping(event_dict)


def configure_logging() -> None:
    """Configure JSON structured logging once at process start."""
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            _add_context,
            _redact_event,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = "quilore-ai"):
    return structlog.get_logger(name)


@contextmanager
def job_trace(job_name: str) -> Iterator[str]:
    """Emit correlated job start/finish logs for cross-service tracing."""
    job_id = str(uuid4())
    token_id = job_id_ctx.set(job_id)
    token_name = job_name_ctx.set(job_name)
    log = get_logger()
    log.info("job_started", jobName=job_name, jobId=job_id)
    try:
        yield job_id
    finally:
        log.info("job_finished", jobName=job_name, jobId=job_id)
        job_id_ctx.reset(token_id)
        job_name_ctx.reset(token_name)
