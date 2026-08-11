"""Contract tests for AI gateway routing and response normalization."""

from pathlib import Path

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
    assert data["selected_provider"] is None
    assert data["fallback_chain"] == ["groq", "openrouter", "huggingface"]
    assert "queued" in data["message"].lower() or "provider" in data["message"].lower()


def test_route_all_task_types_return_contract():
    for task in TaskType:
        response = client.get(f"/ai/providers/route/{task.value}")
        assert response.status_code == 200
        data = response.json()
        assert data["task"] == task.value
        assert data["fallback_chain"] == FALLBACK_MATRIX[task]
        assert "selected_provider" in data
        assert "message" in data


def test_invoke_returns_normalized_editable_envelope():
    response = client.post(
        "/ai/tasks/chat/invoke",
        json={"input": {"prompt": "suggest a deload"}, "prefer_provider": None},
    )
    assert response.status_code == 200
    data = response.json()
    assert REQUIRED_ENVELOPE_FIELDS <= set(data.keys())
    # Product rule: AI output is never final / always editable.
    assert data["editable"] is True
    assert data["user_confirmation_required"] is True
    assert data["degraded"] is True
    assert data["provider"] is None
    assert data["task"] == "chat"
    # Validate against Pydantic contract explicitly
    NormalizedAIResponse.model_validate(data)


def test_invoke_all_task_types_normalize():
    for task in TaskType:
        response = client.post(f"/ai/tasks/{task.value}/invoke", json={"input": {}})
        assert response.status_code == 200, task
        data = response.json()
        assert data["editable"] is True
        assert data["user_confirmation_required"] is True
        assert data["task"] == task.value
        NormalizedAIResponse.model_validate(data)


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
