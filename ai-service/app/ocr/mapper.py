"""OCR text → workout schema mapping via AI gateway contracts (not direct client)."""

from __future__ import annotations

import re
from typing import Any

EXERCISE_LINE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9 \-/]+?)\s+"
    r"(?P<sets>\d+)\s*[xX×]\s*(?P<reps>\d+)"
    r"(?:\s*@\s*(?P<load>\d+(?:\.\d+)?)\s*(?P<unit>kg|lbs)?)?",
    re.MULTILINE,
)


def map_ocr_text_to_schema(text: str) -> dict[str, Any]:
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
        "source": "ocr_text",
        "exercises": exercises,
        "unresolved": unresolved,
        "lowConfidenceHighlighted": True,
        "userConfirmationRequired": True,
        "editable": True,
        "message": "OCR draft mapped to schema — review and edit before save.",
    }
