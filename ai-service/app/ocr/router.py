from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.ocr.mapper import map_ocr_text_to_schema
from app.security.internal_auth import require_internal_token

router = APIRouter(dependencies=[Depends(require_internal_token)])


class OcrMapRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source: str = "on_device_ocr"


@router.post("/map-to-schema")
async def map_to_schema(body: OcrMapRequest):
    result = map_ocr_text_to_schema(body.text)
    result["ocrSource"] = body.source
    return result
