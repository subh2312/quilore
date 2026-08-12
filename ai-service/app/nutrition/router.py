from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.nutrition.food_quality import food_quality_feedback

router = APIRouter()


class FoodQualityRequest(BaseModel):
    dishes: list[str] = Field(default_factory=list)
    notes: str | None = None


@router.post("/food-quality")
async def food_quality(body: FoodQualityRequest):
    return food_quality_feedback(body.dishes, body.notes)
