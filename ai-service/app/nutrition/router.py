from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.nutrition.food_quality import food_quality_feedback
from app.security.internal_auth import require_internal_token

router = APIRouter(dependencies=[Depends(require_internal_token)])


class FoodQualityRequest(BaseModel):
    dishes: list[str] = Field(default_factory=list)
    notes: str | None = None


@router.post("/food-quality")
async def food_quality(body: FoodQualityRequest):
    return food_quality_feedback(body.dishes, body.notes)
