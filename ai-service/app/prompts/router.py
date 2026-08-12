from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.prompts.workout_parse import build_workout_parse_prompt, recover_from_parse_error

router = APIRouter()


class ParsePromptRequest(BaseModel):
    transcript: str = Field(..., min_length=1)


class RecoverRequest(BaseModel):
    transcript: str
    error: str = "parse_failed"


@router.post("/workout-parse/prompt")
async def workout_parse_prompt(body: ParsePromptRequest):
    return build_workout_parse_prompt(body.transcript)


@router.post("/workout-parse/recover")
async def workout_parse_recover(body: RecoverRequest):
    return recover_from_parse_error(body.transcript, body.error)
