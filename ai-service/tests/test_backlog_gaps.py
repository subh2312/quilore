"""Tests for OCR mapping, queue, food quality, prompts, resilience, and live invoke."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.nutrition.food_quality import food_quality_feedback
from app.ocr.mapper import map_ocr_text_to_schema
from app.prompts.workout_parse import build_workout_parse_prompt, recover_from_parse_error
from app.resilience.provider_resilience import (
    ProviderTransientError,
    call_with_resilience,
    get_breaker,
)

client = TestClient(app)


def test_ocr_map_to_schema_highlights_unresolved():
    mapped = map_ocr_text_to_schema("Squat 3x5 @ 100kg\n?? weird line")
    assert mapped["llmMapped"] is False
    assert mapped["editable"] is True
    assert mapped["userConfirmationRequired"] is True
    assert len(mapped["exercises"]) == 1
    assert mapped["unresolved"]


def test_ocr_http_endpoint():
    res = client.post("/ai/ocr/map-to-schema", json={"text": "Bench 3x8 @ 60kg"})
    assert res.status_code == 200
    assert res.json()["exercises"][0]["name"].lower().startswith("bench")


def test_queue_idempotent_enqueue_and_status(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_token", "test-internal-token")
    headers = {"X-Internal-Token": "test-internal-token"}
    unauthorized = client.post(
        "/ai/queue/jobs",
        json={"task_type": "program_generation", "payload": {}, "idempotency_key": "k1"},
    )
    assert unauthorized.status_code == 401
    a = client.post(
        "/ai/queue/jobs",
        json={"task_type": "program_generation", "payload": {}, "idempotency_key": "k1"},
        headers=headers,
    )
    b = client.post(
        "/ai/queue/jobs",
        json={"task_type": "program_generation", "payload": {}, "idempotency_key": "k1"},
        headers=headers,
    )
    assert a.status_code == 200
    assert a.json()["job"]["id"] == b.json()["job"]["id"]
    job_id = a.json()["job"]["id"]
    client.post("/ai/queue/jobs/process-next", headers=headers)
    got = client.get(f"/ai/queue/jobs/{job_id}", headers=headers)
    assert got.json()["status"] == "completed"
    assert got.json()["result"] is not None


def test_food_quality_advisory_not_judgmental():
    out = food_quality_feedback(["fried samosa", "dal"], notes=None)
    assert out["judgmental"] is False
    assert out["advisory"] is True
    assert out["editable"] is True


def test_workout_parse_prompt_and_recovery():
    prompt = build_workout_parse_prompt("bench three by eight")
    assert "nvidia_nim" in prompt["providerPriority"]
    recovered = recover_from_parse_error("??? ", "parse_failed")
    assert recovered["recoverable"] is True
    assert recovered["editable"] is True


def test_resilience_circuit_opens_after_failures():
    provider = "test_provider_cb"
    breaker = get_breaker(provider)
    breaker.failures = 0
    breaker.state = breaker.state.CLOSED

    def boom():
        raise ProviderTransientError("429")

    for _ in range(3):
        call_with_resilience(provider, boom)
    blocked = call_with_resilience(provider, boom)
    assert blocked["degraded"] is True
    assert blocked["ok"] is False


def test_invoke_returns_live_or_heuristic_not_503(internal_auth_headers):
    res = client.post(
        "/ai/tasks/chat/invoke",
        json={"input": {"prompt": "hi"}},
        headers=internal_auth_headers,
    )
    assert res.status_code == 200
    assert "reply" in res.json()["content"]


def test_food_quality_uses_nim_when_configured():
    fake = {
        "ok": True,
        "feedback": {"suggestions": ["Balanced."], "flaggedDishes": []},
        "safety": {"safe": True},
    }
    with patch("app.nutrition.food_quality.nim_client.food_quality_with_llm", return_value=fake):
        out = food_quality_feedback(["dal"], notes=None)
    assert out["degraded"] is False
