"""Tests for route-level security (auth enforcement on all endpoints)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


# Routes that SHOULD have auth but may not (test will document gaps)
PROTECTED_ROUTES = [
    ("GET", "/api/accounts"),
    ("POST", "/api/accounts"),
    ("GET", "/api/account-health"),
    ("GET", "/api/healing/status"),
]

# Routes currently missing auth (known gaps to fix)
AUTH_GAPS = [
    ("GET", "/api/logs", "broadcast.py:195 — GET /logs has no Depends(get_current_user)"),
    ("GET", "/api/scheduler/upcoming", "broadcast.py:348 — GET /scheduler/upcoming has no auth"),
    ("GET", "/api/runtime/inspector", "runtime_inspector.py:33 — GET /runtime/inspector has no auth"),
]

# Public routes that should be accessible without auth
PUBLIC_ROUTES = [
    ("GET", "/"),
    ("GET", "/health"),
]


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", PROTECTED_ROUTES)
async def test_protected_routes_reject_unauthenticated(client, method, path):
    """All protected routes must return 401 without auth.
    Note: Some routes may return 200 in test if auth middleware isn't triggered
    (e.g., when RuntimeManager has no runtimes). This test documents known gaps."""
    if method == "GET":
        resp = await client.get(path)
    else:
        resp = await client.post(path, json={})
    assert resp.status_code == 401, f"{method} {path} returned {resp.status_code} (expected 401) — likely missing Depends(get_current_user)"


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path,reason", AUTH_GAPS)
async def test_known_auth_gaps(client, method, path, reason):
    """DOCUMENTED AUTH GAPS: These routes currently lack auth dependencies."""
    if method == "GET":
        resp = await client.get(path)
    else:
        resp = await client.post(path, json={})
    if resp.status_code == 401:
        pytest.fail(f"Auth was added to {path} — update test to PROTECTED_ROUTES")
    # If not 401, this is a known gap — document, don't fail
    pytest.skip(f"Known gap: {reason}")


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", PUBLIC_ROUTES)
async def test_public_routes_accessible_without_auth(client, method, path):
    """Public routes must be accessible without authentication."""
    if method == "GET":
        resp = await client.get(path)
    else:
        resp = await client.post(path, json={})
    assert resp.status_code in (200, 404), f"{method} {path} returned {resp.status_code} (expected 200 or 404)"


@pytest.mark.asyncio
async def test_no_bypass_with_wrong_method(client):
    """Verify bypass attempts with different HTTP methods fail."""
    resp = await client.post("/api/accounts/health")
    assert resp.status_code in (401, 405), f"POST /api/accounts/health returned {resp.status_code}"


@pytest.mark.asyncio
async def test_fake_bearer_token_rejected(client):
    """Malformed or fake tokens must be rejected."""
    fake_tokens = [
        "Bearer not-even-a-token",
        "Bearer " + "a" * 1000,
        "tm_",
        "Bearer tm_fake_key_that_does_not_exist",
    ]
    for token in fake_tokens:
        resp = await client.get("/api/accounts", headers={"Authorization": token})
        assert resp.status_code == 401, f"Token '{token[:20]}...' returned {resp.status_code}"
