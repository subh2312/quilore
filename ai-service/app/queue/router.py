from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.queue.job_queue import queue

router = APIRouter()


class EnqueueRequest(BaseModel):
    task_type: str = Field(..., examples=["program_generation", "ocr_cleanup", "meal_batch"])
    payload: dict = Field(default_factory=dict)
    idempotency_key: str | None = None


@router.post("/jobs")
async def enqueue_job(body: EnqueueRequest):
    job = queue.enqueue(body.task_type, body.payload, body.idempotency_key)
    return {"accepted": True, "job": queue.to_dict(job)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = queue.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job_not_found")
    return queue.to_dict(job)


@router.post("/jobs/process-next")
async def process_next():
    job = queue.process_next()
    if job is None:
        return {"processed": False}
    return {"processed": True, "job": queue.to_dict(job)}
