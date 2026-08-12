"""In-process background queue for non-urgent AI tasks (Story 13.2)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from threading import Lock
from typing import Any
from uuid import uuid4

from app.providers import nim_client


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"


@dataclass
class Job:
    id: str
    task_type: str
    payload: dict[str, Any]
    status: JobStatus = JobStatus.QUEUED
    idempotency_key: str | None = None
    attempts: int = 0
    max_attempts: int = 3
    result: dict[str, Any] | None = None
    error: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


def _execute_job(job: Job) -> dict[str, Any]:
    if job.task_type == "program_generation":
        prompt = str(job.payload.get("prompt") or job.payload.get("goal") or "general fitness")
        if nim_client.nim_configured():
            result = nim_client.coach_reply(
                f"Design a weekly training program as JSON. Goal: {prompt}",
                escalate=bool(job.payload.get("escalate")),
            )
            if result.get("ok"):
                return {
                    "status": "completed",
                    "programText": result.get("text"),
                    "model": result.get("model"),
                    "editable": True,
                    "userConfirmationRequired": True,
                    "degraded": False,
                }
        return {
            "status": "completed_stub",
            "programText": "4-day starter split — edit before saving.",
            "editable": True,
            "userConfirmationRequired": True,
            "degraded": True,
        }
    if job.task_type == "ocr_cleanup":
        from app.ocr.mapper import map_ocr_text_to_schema

        return map_ocr_text_to_schema(str(job.payload.get("text", "")))
    if job.task_type == "meal_batch":
        from app.nutrition.food_quality import food_quality_feedback

        dishes = job.payload.get("dishes") or []
        return food_quality_feedback([str(d) for d in dishes], job.payload.get("notes"))
    return {"status": "completed", "editable": True, "degraded": True}


class AiJobQueue:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._idempotency: dict[str, str] = {}
        self._lock = Lock()

    def enqueue(
        self,
        task_type: str,
        payload: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> Job:
        with self._lock:
            if idempotency_key and idempotency_key in self._idempotency:
                return self._jobs[self._idempotency[idempotency_key]]
            job = Job(
                id=str(uuid4()),
                task_type=task_type,
                payload=payload,
                idempotency_key=idempotency_key,
            )
            self._jobs[job.id] = job
            if idempotency_key:
                self._idempotency[idempotency_key] = job.id
            return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def process_next(self) -> Job | None:
        with self._lock:
            job = next((j for j in self._jobs.values() if j.status == JobStatus.QUEUED), None)
            if job is None:
                return None
            job.status = JobStatus.RUNNING
            job.attempts += 1
            job.updated_at = datetime.now(UTC).isoformat()
        try:
            result = _execute_job(job)
            with self._lock:
                job.status = JobStatus.COMPLETED
                job.result = result
                job.updated_at = datetime.now(UTC).isoformat()
        except Exception as exc:  # noqa: BLE001
            with self._lock:
                if job.attempts >= job.max_attempts:
                    job.status = JobStatus.DEAD_LETTER
                else:
                    job.status = JobStatus.FAILED
                job.error = str(exc)
                job.updated_at = datetime.now(UTC).isoformat()
        return job

    def fail(self, job_id: str, error: str) -> Job | None:
        job = self._jobs.get(job_id)
        if not job:
            return None
        with self._lock:
            if job.attempts >= job.max_attempts:
                job.status = JobStatus.DEAD_LETTER
            else:
                job.status = JobStatus.FAILED
            job.error = error
            job.updated_at = datetime.now(UTC).isoformat()
        return job

    def to_dict(self, job: Job) -> dict[str, Any]:
        return {
            "id": job.id,
            "taskType": job.task_type,
            "status": job.status.value,
            "attempts": job.attempts,
            "idempotencyKey": job.idempotency_key,
            "result": job.result,
            "error": job.error,
            "createdAt": job.created_at,
            "updatedAt": job.updated_at,
        }


queue = AiJobQueue()
