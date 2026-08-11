"""Exercise name mapping against the local exercise catalog."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ExerciseRecord:
    id: str
    name: str
    aliases: tuple[str, ...]


CATALOG: tuple[ExerciseRecord, ...] = (
    ExerciseRecord("ex_back_squat", "Back Squat", ("squat", "barbell squat", "back squat")),
    ExerciseRecord("ex_bench", "Bench Press", ("bench", "barbell bench", "chest press")),
    ExerciseRecord(
        "ex_deadlift",
        "Conventional Deadlift",
        ("deadlift", "dl", "conventional deadlift"),
    ),
    ExerciseRecord("ex_ohp", "Overhead Press", ("ohp", "shoulder press", "military press")),
    ExerciseRecord("ex_row", "Barbell Row", ("row", "bent over row", "barbell row")),
)


def map_exercise(query: str, limit: int = 5) -> list[dict]:
    if not query or not query.strip():
        return []
    q = query.strip().lower()
    scored: list[tuple[float, ExerciseRecord, str]] = []
    for record in CATALOG:
        if record.name.lower() == q:
            scored.append((1.0, record, "exact"))
            continue
        for alias in record.aliases:
            if alias == q:
                scored.append((0.95, record, "alias"))
                break
            if q in alias or alias in q or q in record.name.lower():
                scored.append((0.75, record, "partial"))
                break
    scored.sort(key=lambda item: item[0], reverse=True)
    out = []
    seen: set[str] = set()
    for score, record, match in scored:
        if record.id in seen:
            continue
        seen.add(record.id)
        out.append(
            {
                "id": record.id,
                "name": record.name,
                "score": score,
                "matchType": match,
            }
        )
        if len(out) >= limit:
            break
    return out
