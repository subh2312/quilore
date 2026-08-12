"""Security tests for privileged AI service routes."""

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_queue_routes_require_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_token", "secure-worker-token")
    auth_headers = {"Authorization": "Bearer secure-worker-token"}

    for method, path, kwargs in (
        ("post", "/ai/queue/jobs", {"json": {"task_type": "ocr_cleanup", "payload": {}}}),
        ("get", "/ai/queue/jobs/some-id", {}),
        ("post", "/ai/queue/jobs/process-next", {}),
    ):
        missing = getattr(client, method)(path, **kwargs)
        assert missing.status_code == 401
        assert missing.json()["detail"] == "invalid_internal_api_token"

        invalid = getattr(client, method)(
            path,
            headers={"X-Internal-Token": "wrong-token"},
            **kwargs,
        )
        assert invalid.status_code == 401

        authorized = getattr(client, method)(path, headers=auth_headers, **kwargs)
        assert authorized.status_code in {200, 404}


def test_process_next_fails_closed_when_token_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_token", "")

    response = client.post(
        "/ai/queue/jobs/process-next",
        headers={"X-Internal-Token": "anything"},
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "internal_api_token_not_configured"
