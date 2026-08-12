from fastapi import APIRouter
from pydantic import BaseModel

from app.exercises.mapping import map_exercise

router = APIRouter()


class MapRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("/map")
async def map_parsed_exercise(body: MapRequest) -> dict:
    return {"query": body.query, "candidates": map_exercise(body.query, limit=body.limit)}
