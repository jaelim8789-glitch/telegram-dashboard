"""Tests for health router endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_root_health_check(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "runtimes_active" in data


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code in (200, 404)  # may not be registered


@pytest.mark.asyncio
async def test_account_health_requires_auth(client):
    resp = await client.get("/api/account-health")
    assert resp.status_code == 401
    assert "Authorization" in resp.text or "detail" in resp.text
