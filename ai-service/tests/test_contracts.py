"""Contract tests for AI gateway routing and response normalization."""

from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.providers.contracts import NormalizedAIResponse
from app.providers.router import FALLBACK_MATRIX, TaskType

client = TestClient(app)

REQUIRED_ENVELOPE_FIELDS = {
    "task",
    "provider",
    "fallback_used",
    "degraded",
    "content",
    "confidence",
    "message",
    "editable",
    "user_confirmation_required",
}


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "quilore-ai-service"
    assert "timestamp" in data
    assert "nvidia_nim" in data["circuits"]


def test_provider_status_covers_full_fallback_matrix():
    response = client.get("/ai/providers/status")
    assert response.status_code == 200
    data = response.json()
    task_names = {item["task"] for item in data}
    assert task_names == {t.value for t in TaskType}
    by_task = {item["task"]: item for item in data}
    for task, chain in FALLBACK_MATRIX.items():
        names = [p["name"] for p in by_task[task.value]["providers"]]
        assert names == chain


def test_route_task_graceful_degradation_without_keys():
    response = client.get("/ai/providers/route/chat")
    assert response.status_code == 200
    data = response.json()
    assert data["task"] == "chat"
    assert data["fallback_chain"][0] == "nvidia_nim"
    assert data["selected_provider"] is None
    assert "provider" in data["message"].lower() or "heuristic" in data["message"].lower()


def test_route_all_task_types_return_contract():
    for task in TaskType:
        response = client.get(f"/ai/providers/route/{task.value}")
        assert response.status_code == 200
        data = response.json()
        assert data["task"] == task.value
        assert data["fallback_chain"] == FALLBACK_MATRIX[task]
        assert "selected_provider" in data
        assert "message" in data


def test_invoke_returns_heuristic_envelope_without_keys(internal_auth_headers):
    response = client.post(
        "/ai/tasks/chat/invoke",
        json={"input": {"prompt": "suggest a deload"}},
        headers=internal_auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert REQUIRED_ENVELOPE_FIELDS <= set(data.keys())
    assert data["degraded"] is True
    assert "reply" in data["content"]
    NormalizedAIResponse.model_validate(data)


def test_invoke_all_task_types_return_envelope_not_503(internal_auth_headers):
    for task in TaskType:
        response = client.post(
            f"/ai/tasks/{task.value}/invoke",
            json={"input": {}},
            headers=internal_auth_headers,
        )
        assert response.status_code == 200, task
        data = response.json()
        assert data["editable"] is True
        assert data["user_confirmation_required"] is True
        assert data["degraded"] is True
        NormalizedAIResponse.model_validate(data)


def test_invoke_live_envelope_when_nim_mocked(internal_auth_headers):
    with patch("app.providers.router._provider_available", return_value=True):
        with patch(
            "app.providers.router.call_with_resilience",
            return_value={"ok": True, "result": {"reply": "Deload week."}},
        ):
            response = client.post(
                "/ai/tasks/chat/invoke",
                json={"input": {"prompt": "hi"}},
                headers=internal_auth_headers,
            )
    data = response.json()
    assert data["degraded"] is False
    assert data["provider"] == "nvidia_nim"


def test_ai_service_has_no_direct_db_write_imports():
    """Locked Architecture: FastAPI must not write to the source-of-truth DB."""
    app_root = Path(__file__).resolve().parents[1] / "app"
    forbidden = (
        "sqlalchemy",
        "create_engine",
        "asyncpg.connect",
        "psycopg2.connect",
        "INSERT INTO",
        "UPDATE ",
        "DELETE FROM",
    )
    offenders: list[str] = []
    for path in app_root.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        for token in forbidden:
            if token in text:
                offenders.append(f"{path.relative_to(app_root)}:{token}")
    assert offenders == [], f"AI service must not contain DB write paths: {offenders}"
