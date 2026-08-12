"""Groq-oriented structured workout parse prompt (Story NLP prompt)."""

WORKOUT_PARSE_SYSTEM = """You are Quilore's workout parser. Convert natural-language gym logs into JSON.
Rules:
- Output ONLY JSON with keys: exercises[], unresolved[], confidence, editable=true.
- Each exercise: name, sets, reps, load (nullable), unit, notes.
- Never invent loads the user did not say.
- Mark low-confidence items in unresolved for manual recovery.
- This is coaching structure, not medical advice.
"""

WORKOUT_PARSE_USER_TEMPLATE = """Parse this workout transcript into structured JSON:
---
{transcript}
---
If parsing fails partially, keep recoverable fragments and list unclear phrases in unresolved.
"""


def build_workout_parse_prompt(transcript: str) -> dict[str, str]:
    return {
        "system": WORKOUT_PARSE_SYSTEM,
        "user": WORKOUT_PARSE_USER_TEMPLATE.format(transcript=transcript.strip()),
        "providerPriority": "groq->openrouter->huggingface",
        "responseSchema": "workout_parse_v1",
        "editable": "true",
    }


def recover_from_parse_error(transcript: str, error: str) -> dict:
    """NL parsing error recovery — fall back to editable freeform draft."""
    return {
        "ok": False,
        "recoverable": True,
        "error": error,
        "draft": {
            "rawTranscript": transcript,
            "exercises": [],
            "unresolved": [{"raw": transcript, "reason": "parse_failed"}],
        },
        "message": "Could not fully parse — edit the draft manually or retry.",
        "editable": True,
        "fallback": "manual_edit",
    }
