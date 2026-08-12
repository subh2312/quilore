from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ocr.mapper import map_ocr_text_to_schema

router = APIRouter()


class OcrMapRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source: str = "on_device_ocr"


@router.post("/map-to-schema")
async def map_to_schema(body: OcrMapRequest):
    result = map_ocr_text_to_schema(body.text)
    result["ocrSource"] = body.source
    return result
