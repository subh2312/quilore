"""Security tests for privileged AI service routes."""

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_process_next_requires_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_token", "secure-worker-token")

    missing = client.post("/ai/queue/jobs/process-next")
    assert missing.status_code == 401
    assert missing.json()["detail"] == "invalid_internal_api_token"

    invalid = client.post(
        "/ai/queue/jobs/process-next",
        headers={"X-Internal-Token": "wrong-token"},
    )
    assert invalid.status_code == 401

    authorized = client.post(
        "/ai/queue/jobs/process-next",
        headers={"Authorization": "Bearer secure-worker-token"},
    )
    assert authorized.status_code == 200


def test_process_next_fails_closed_when_token_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_token", "")

    response = client.post(
        "/ai/queue/jobs/process-next",
        headers={"X-Internal-Token": "anything"},
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "internal_api_token_not_configured"
