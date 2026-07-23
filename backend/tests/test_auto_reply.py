"""Tests for auto-reply router endpoints."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


AUTO_REPLY_BODY = {
    "name": "Test Rule",
    "match_type": "keyword",
    "match_value": "test",
    "reply_content": "Test reply",
    "cooldown_hours": 1,
    "max_replies_per_day": 10,
    "is_active": True,
}


@pytest.mark.asyncio
async def test_get_auto_reply_requires_auth(client):
    resp = await client.get(f"/api/accounts/{uuid.uuid4().hex}/auto-reply")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_auto_reply_requires_auth(client):
    resp = await client.post(
        f"/api/accounts/{uuid.uuid4().hex}/auto-reply",
        json=AUTO_REPLY_BODY,
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_update_auto_reply_requires_auth(client):
    resp = await client.put(
        f"/api/accounts/{uuid.uuid4().hex}/auto-reply/{uuid.uuid4().hex}",
        json={"name": "Updated"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_auto_reply_requires_auth(client):
    resp = await client.delete(
        f"/api/accounts/{uuid.uuid4().hex}/auto-reply/{uuid.uuid4().hex}"
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_toggle_auto_reply_requires_auth(client):
    resp = await client.post(
        f"/api/accounts/{uuid.uuid4().hex}/auto-reply/toggle",
        json={"enabled": True},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_auto_reply_logs_requires_auth(client):
    resp = await client.get(f"/api/accounts/{uuid.uuid4().hex}/auto-reply/logs")
    assert resp.status_code == 401
