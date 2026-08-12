"""In-process background queue for non-urgent AI tasks (Story 13.2).

Jobs are queued instead of blocking; status is queryable. Idempotency keys
prevent duplicate side effects. Durable Redis/RabbitMQ can replace this later.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from threading import Lock
from typing import Any
from uuid import uuid4


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
        # Deterministic stub completion — live adapters remain deferred (PR #5 Path B).
        with self._lock:
            job.status = JobStatus.COMPLETED
            job.result = {
                "status": "queued_complete_stub",
                "note": "Background queue accepted work; live AI adapters remain deferred.",
                "editable": True,
            }
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
