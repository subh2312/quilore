"""Food-quality feedback via NIM coach + safety, with rule fallback."""

from __future__ import annotations

from typing import Any

from app.providers import nim_client

OIL_CUES = ("fried", "oil", "ghee", "deep fry", "pakora", "samosa", "bhaji")


def _rules_fallback(dishes: list[str], notes: str | None = None) -> dict[str, Any]:
    lower = [d.lower() for d in dishes]
    oily = [d for d in lower if any(c in d for c in OIL_CUES)]
    suggestions: list[str] = []
    if oily:
        suggestions.append(
            "This plate looks oil-forward — if you want a lighter swap, "
            "try air-fried or sautéed versions and keep portions editable."
        )
    if notes and "late" in notes.lower():
        suggestions.append(
            "Late eating noted — consider an earlier window when schedule allows (advisory)."
        )
    if not suggestions:
        suggestions.append("No strong quality flags — keep logging and adjust portions as needed.")
    return {
        "advisory": True,
        "judgmental": False,
        "confidenceBoundary": "heuristic_v1",
        "flaggedDishes": oily,
        "suggestions": suggestions,
        "improvedRecipeHint": (
            "Request a lighter recipe variant in chat — output stays user-editable."
        ),
        "editable": True,
        "degraded": True,
    }


def food_quality_feedback(dishes: list[str], notes: str | None = None) -> dict[str, Any]:
    llm = nim_client.food_quality_with_llm(dishes, notes)
    if llm.get("ok") and llm.get("feedback"):
        feedback = llm["feedback"]
        return {
            "advisory": True,
            "judgmental": False,
            "confidenceBoundary": "llm_v1",
            "flaggedDishes": feedback.get("flaggedDishes", []),
            "suggestions": feedback.get("suggestions", []),
            "improvedRecipeHint": (
                "Request a lighter recipe variant in chat — output stays user-editable."
            ),
            "editable": True,
            "degraded": False,
            "safety": llm.get("safety"),
        }
    return _rules_fallback(dishes, notes)
