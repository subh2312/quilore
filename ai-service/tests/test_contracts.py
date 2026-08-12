"""Contract tests for AI gateway routing and response normalization."""

from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.providers.contracts import NormalizedAIResponse
from app.providers.router import FALLBACK_MATRIX, TaskType

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert "nvidia_nim" in response.json()["circuits"]


def test_provider_status_covers_full_fallback_matrix():
    response = client.get("/ai/providers/status")
    assert response.status_code == 200
    task_names = {item["task"] for item in response.json()}
    assert task_names == {t.value for t in TaskType}


def test_route_task_graceful_degradation_without_keys():
    response = client.get("/ai/providers/route/chat")
    assert response.status_code == 200
    assert response.json()["fallback_chain"][0] == "nvidia_nim"


def test_route_all_task_types_return_contract():
    for task in TaskType:
        response = client.get(f"/ai/providers/route/{task.value}")
        assert response.status_code == 200
        assert response.json()["fallback_chain"] == FALLBACK_MATRIX[task]


def test_invoke_returns_heuristic_envelope_without_keys():
    response = client.post("/ai/tasks/chat/invoke", json={"input": {"prompt": "deload"}})
    assert response.status_code == 200
    data = response.json()
    assert data["degraded"] is True
    assert "reply" in data["content"]
    NormalizedAIResponse.model_validate(data)


def test_invoke_all_task_types_return_envelope_not_503():
    for task in TaskType:
        response = client.post(f"/ai/tasks/{task.value}/invoke", json={"input": {}})
        assert response.status_code == 200, task
        assert response.json()["degraded"] is True


def test_invoke_live_envelope_when_nim_mocked():
    with patch("app.providers.router._provider_available", return_value=True):
        with patch(
            "app.providers.router._invoke_nim",
            return_value={"reply": "Deload week.", "model": "nvidia/test"},
        ):
            with patch(
                "app.providers.router.call_with_resilience",
                return_value={"ok": True, "result": {"reply": "Deload week."}},
            ):
                response = client.post("/ai/tasks/chat/invoke", json={"input": {"prompt": "hi"}})
    data = response.json()
    assert data["degraded"] is False
    assert data["provider"] == "nvidia_nim"


def test_ai_service_has_no_direct_db_write_imports():
    app_root = Path(__file__).resolve().parents[1] / "app"
    forbidden = ("sqlalchemy", "create_engine", "INSERT INTO", "UPDATE ", "DELETE FROM")
    offenders = []
    for path in app_root.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        for token in forbidden:
            if token in text:
                offenders.append(f"{path.name}:{token}")
    assert offenders == []
