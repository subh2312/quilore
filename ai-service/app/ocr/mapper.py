"""OCR text → workout schema mapping via NIM with regex fallback."""

from __future__ import annotations

import re
from typing import Any

from app.providers import nim_client

EXERCISE_LINE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9 \-/]+?)\s+"
    r"(?P<sets>\d+)\s*[xX×]\s*(?P<reps>\d+)"
    r"(?:\s*@\s*(?P<load>\d+(?:\.\d+)?)\s*(?P<unit>kg|lbs)?)?",
    re.MULTILINE,
)


def _regex_map(text: str) -> dict[str, Any]:
    lines = [ln.strip() for ln in (text or "").splitlines() if ln.strip()]
    exercises: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    for line in lines:
        m = EXERCISE_LINE.match(line)
        if not m:
            unresolved.append({"raw": line, "confidence": 0.2, "needsReview": True})
            continue
        exercises.append(
            {
                "name": m.group("name").strip(),
                "sets": int(m.group("sets")),
                "reps": int(m.group("reps")),
                "load": float(m.group("load")) if m.group("load") else None,
                "unit": m.group("unit") or "kg",
                "confidence": 0.75,
                "editable": True,
            }
        )
    return {
        "source": "ocr_text_regex",
        "exercises": exercises,
        "unresolved": unresolved,
        "lowConfidenceHighlighted": True,
        "userConfirmationRequired": True,
        "editable": True,
        "llmMapped": False,
        "message": "OCR draft mapped via regex fallback — review and edit before save.",
    }


def map_ocr_text_to_schema(text: str) -> dict[str, Any]:
    llm = nim_client.map_ocr_with_llm(text)
    if llm.get("ok") and llm.get("schema"):
        schema = llm["schema"]
        return {
            "source": "ocr_text_nim",
            "exercises": schema.get("exercises", []),
            "unresolved": schema.get("unresolved", []),
            "lowConfidenceHighlighted": True,
            "userConfirmationRequired": True,
            "editable": True,
            "llmMapped": True,
            "message": "OCR draft mapped via NIM — review and edit before save.",
        }
    mapped = _regex_map(text)
    mapped["degraded"] = True
    return mapped
