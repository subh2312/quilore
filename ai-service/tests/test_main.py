"""Tests for the AI service health and provider endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    """Health endpoint should return 200 with service info."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "quilore-ai-service"
    assert "timestamp" in data


def test_provider_status_returns_all_tasks():
    """Provider status should list all task types from the fallback matrix."""
    response = client.get("/ai/providers/status")
    assert response.status_code == 200
    data = response.json()
    task_names = {item["task"] for item in data}
    assert "chat" in task_names
    assert "vision" in task_names
    assert "embeddings" in task_names


def test_route_task_graceful_degradation():
    """Routing with no API keys configured should return graceful message."""
    response = client.get("/ai/providers/route/chat")
    assert response.status_code == 200
    data = response.json()
    assert data["task"] == "chat"
    assert data["fallback_chain"] == ["groq", "openrouter", "huggingface"]
