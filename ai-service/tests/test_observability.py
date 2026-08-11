"""Observability contract tests for the AI service."""

from fastapi.testclient import TestClient

from app.main import app
from app.observability.logging import job_trace
from app.observability.redaction import redact_mapping, redact_text

client = TestClient(app)


def test_health_echoes_correlation_id():
    response = client.get("/health", headers={"X-Correlation-ID": "ai-corr-1"})
    assert response.status_code == 200
    assert response.headers["x-correlation-id"] == "ai-corr-1"


def test_metrics_expose_latency_and_provider_gauges():
    client.get("/health")
    response = client.get("/metrics")
    assert response.status_code == 200
    body = response.text
    assert "quilore_ai_http_request_duration_seconds" in body
    assert "quilore_ai_provider_available" in body


def test_redaction_policy_strips_secrets():
    payload = redact_mapping(
        {
            "prompt": "hello",
            "api_key": "secret-value",
            "authorization": "Bearer abc.def",
            "nested": {"hf_api_token": "hf-xxx"},
        }
    )
    assert payload["prompt"] == "hello"
    assert payload["api_key"] == "[REDACTED]"
    assert payload["authorization"] == "[REDACTED]"
    assert payload["nested"]["hf_api_token"] == "[REDACTED]"
    assert "[REDACTED]" in (redact_text("Bearer abc.def") or "")


def test_job_trace_context_manager():
    with job_trace("unit-job") as job_id:
        assert isinstance(job_id, str)
        assert len(job_id) > 0
