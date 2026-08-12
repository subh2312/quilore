"""Shared pytest fixtures for AI service tests."""

import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def configure_internal_api_token(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_token", "test-internal-token")


@pytest.fixture
def internal_auth_headers():
    return {"X-Internal-Token": "test-internal-token"}
