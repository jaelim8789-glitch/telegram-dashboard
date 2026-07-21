"""
Tests for Cryptomus crypto payment router.

Covers:
  - create-invoice success and validation
  - webhook signature verification (valid / invalid)
  - duplicate webhook prevention
  - amount mismatch handling
  - payment status retrieval
"""

from __future__ import annotations

import hashlib
import hmac
import importlib
import json
import os
import sqlite3
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient


# ── Paths ────────────────────────────────────────────────────────────

TEST_DIR = os.path.dirname(__file__)
TEST_DB_PATH = os.path.join(TEST_DIR, "_tmp_cryptomus_test.db")
TEST_ADMIN_DB_PATH = os.path.join(TEST_DIR, "_tmp_cryptomus_test_admin.db")


# ── Fixtures ─────────────────────────────────────────────────────────


def _make_mock_auth(user_id: str, username: str = "authtest"):
    async def _mock_get_current_user(authorization: str | None = None):
        return {
            "id": user_id,
            "username": username,
            "role": "admin",
            "plan": "free",
            "is_active": True,
            "is_suspended": 0,
            "from_api_key": False,
            "api_key_id": None,
            "feature_flags": {},
            "max_accounts": 1,
            "daily_limit": 100,
        }
    return _mock_get_current_user


@pytest.fixture(autouse=True)
def _reset_singletons_and_dbs(monkeypatch):
    for p in [TEST_DB_PATH, TEST_ADMIN_DB_PATH]:
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass

    monkeypatch.setenv("CRYPTOMUS_DB_PATH", TEST_DB_PATH)
    monkeypatch.setenv("ADMIN_DB_PATH", TEST_ADMIN_DB_PATH)
    monkeypatch.setenv("CRYPTOMUS_API_KEY", "test_api_key")
    monkeypatch.setenv("CRYPTOMUS_MERCHANT_ID", "test_merchant")
    monkeypatch.setenv("CRYPTOMUS_WEBHOOK_SECRET", "test_secret")

    import backend.admin_platform as ap_mod
    importlib.reload(ap_mod)
    ap_mod.AdminPlatform._instance = None

    import backend.cryptomus as c_mod
    importlib.reload(c_mod)

    admin = ap_mod.AdminPlatform.get_instance()
    fixed_user = admin.create_user("authtest", "pw123456", plan="free")

    import backend.auth_middleware as auth_mod
    monkeypatch.setattr(auth_mod, "get_current_user", _make_mock_auth(fixed_user["id"]))

    import backend.routers.cryptomus_payments as cp_mod
    importlib.reload(cp_mod)
    cp_mod.init_cryptomus_db()

    import backend.main as main_mod
    importlib.reload(main_mod)

    import backend.tests.test_cryptomus_payments as test_mod
    test_mod._fixed_user = fixed_user
    test_mod._cp_mod = cp_mod
    test_mod._c_mod = c_mod

    yield

    ap_mod.AdminPlatform._instance = None
    for p in [TEST_DB_PATH, TEST_ADMIN_DB_PATH]:
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass


@pytest.fixture()
def client():
    import backend.main as main_mod
    return TestClient(main_mod.app)


@pytest.fixture()
def admin(monkeypatch):
    import backend.admin_platform as ap_mod
    ap_mod.AdminPlatform._instance = None
    instance = ap_mod.AdminPlatform.get_instance()
    yield instance
    ap_mod.AdminPlatform._instance = None


# ── Helpers ──────────────────────────────────────────────────────────


def _make_webhook_body(invoice_id: str, status: str, payment_amount: str = "99.99", payment_currency: str = "USDT") -> bytes:
    payload = {
        "uuid": invoice_id,
        "order_id": str(uuid.uuid4()),
        "status": status,
        "amount": "99.99",
        "payment_amount": payment_amount,
        "payment_currency": payment_currency,
        "network": "TRC20",
        "address": "TTestAddress123",
    }
    return json.dumps(payload).encode()


def _sign_body(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


# ── Tests ────────────────────────────────────────────────────────────


def test_create_invoice_success(client, monkeypatch, admin):
    result_data = {
        "uuid": "inv-123",
        "order_id": "ord-123",
        "status": "process",
        "amount": "99.99",
        "currency": "USDT",
        "network": "TRC20",
        "address": "TTestAddress123",
        "qr_code": "https://example.com/qr.png",
        "expired_at": "2026-07-21T10:30:00Z",
    }
    monkeypatch.setattr(
        "backend.routers.cryptomus_payments.create_cryptomus_invoice",
        AsyncMock(return_value=result_data),
    )

    resp = client.post(
        "/api/payments/crypto/create-invoice",
        json={"plan": "PRO", "network": "TRC20"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["invoice_id"] == "inv-123"
    assert data["plan"] == "pro"
    assert data["network"] == "TRC20"
    assert data["amount_usd"] == 99.99
    assert data["payment_address"] == "TTestAddress123"


def test_create_invoice_invalid_plan(client):
    resp = client.post(
        "/api/payments/crypto/create-invoice",
        json={"plan": "UNKNOWN", "network": "TRC20"},
    )
    assert resp.status_code == 400
    assert "Invalid plan" in resp.json()["detail"]


def test_create_invoice_free_plan(client):
    resp = client.post(
        "/api/payments/crypto/create-invoice",
        json={"plan": "FREE", "network": "TRC20"},
    )
    assert resp.status_code == 400
    assert "FREE plan does not require payment" in resp.json()["detail"]


def test_create_invoice_invalid_network(client):
    resp = client.post(
        "/api/payments/crypto/create-invoice",
        json={"plan": "PRO", "network": "INVALID"},
    )
    assert resp.status_code == 400
    assert "Invalid network" in resp.json()["detail"]


def test_webhook_valid_signature_paid(client, monkeypatch, admin):
    user = admin.create_user("webhookuser", "pw123456", plan="free")
    invoice_id = "inv-webhook-1"
    conn = sqlite3.connect(TEST_DB_PATH, timeout=10)
    conn.execute(
        """
        INSERT INTO cryptomus_payments
        (id, user_id, invoice_id, order_id, plan, network, amount_usd, currency, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        """,
        (
            "pay-1",
            user["id"],
            invoice_id,
            "ord-1",
            "pro",
            "TRC20",
            99.99,
            "USDT",
            "2026-07-21T09:00:00Z",
        ),
    )
    conn.commit()
    conn.close()

    body = _make_webhook_body(invoice_id, "paid", "99.99", "USDT")
    sign = _sign_body(body, "test_secret")

    fake_admin = MagicMock()
    fake_admin.create_api_key.return_value = {"key": "tm_raw_key_123"}
    monkeypatch.setattr(
        "backend.routers.cryptomus_payments.AdminPlatform.get_instance",
        lambda: fake_admin,
    )

    resp = client.post(
        "/api/payments/crypto/webhook",
        content=body,
        headers={"sign": sign, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    fake_admin.create_api_key.assert_called_once_with(
        user_id=user["id"],
        name="Cryptomus API Key",
        plan="pro",
        permissions="read",
    )
    fake_admin.create_subscription.assert_called_once_with(user_id=user["id"], plan="pro")
    fake_admin._audit.assert_called_once()


def test_webhook_invalid_signature(client):
    body = _make_webhook_body("inv-any", "paid")
    resp = client.post(
        "/api/payments/crypto/webhook",
        content=body,
        headers={"sign": "bad_sign", "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is False


def test_webhook_duplicate_prevention(client, monkeypatch, admin):
    user = admin.create_user("dupuser", "pw123456", plan="free")
    invoice_id = "inv-dup-1"
    conn = sqlite3.connect(TEST_DB_PATH, timeout=10)
    conn.execute(
        """
        INSERT INTO cryptomus_payments
        (id, user_id, invoice_id, order_id, plan, network, amount_usd, currency, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
        """,
        (
            "pay-dup",
            user["id"],
            invoice_id,
            "ord-dup",
            "pro",
            "TRC20",
            99.99,
            "USDT",
            "2026-07-21T09:00:00Z",
        ),
    )
    conn.commit()
    conn.close()

    body = _make_webhook_body(invoice_id, "paid")
    sign = _sign_body(body, "test_secret")

    resp = client.post(
        "/api/payments/crypto/webhook",
        content=body,
        headers={"sign": sign, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    assert resp.json().get("duplicate") is True


def test_webhook_amount_mismatch(client, monkeypatch, admin):
    user = admin.create_user("mismatchuser", "pw123456", plan="free")
    invoice_id = "inv-mismatch-1"
    conn = sqlite3.connect(TEST_DB_PATH, timeout=10)
    conn.execute(
        """
        INSERT INTO cryptomus_payments
        (id, user_id, invoice_id, order_id, plan, network, amount_usd, currency, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        """,
        (
            "pay-mm",
            user["id"],
            invoice_id,
            "ord-mm",
            "pro",
            "TRC20",
            99.99,
            "USDT",
            "2026-07-21T09:00:00Z",
        ),
    )
    conn.commit()
    conn.close()

    body = _make_webhook_body(invoice_id, "paid", "199.99", "USDT")
    sign = _sign_body(body, "test_secret")

    resp = client.post(
        "/api/payments/crypto/webhook",
        content=body,
        headers={"sign": sign, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    assert resp.json().get("error") == "amount_mismatch"

    conn = sqlite3.connect(TEST_DB_PATH, timeout=10)
    row = conn.execute(
        "SELECT status FROM cryptomus_payments WHERE invoice_id = ?", (invoice_id,)
    ).fetchone()
    conn.close()
    assert row is not None
    assert row[0] == "amount_mismatch"


def test_webhook_failed_status(client, monkeypatch, admin):
    user = admin.create_user("failuser", "pw123456", plan="free")
    invoice_id = "inv-fail-1"
    conn = sqlite3.connect(TEST_DB_PATH, timeout=10)
    conn.execute(
        """
        INSERT INTO cryptomus_payments
        (id, user_id, invoice_id, order_id, plan, network, amount_usd, currency, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        """,
        (
            "pay-fail",
            user["id"],
            invoice_id,
            "ord-fail",
            "pro",
            "TRC20",
            99.99,
            "USDT",
            "2026-07-21T09:00:00Z",
        ),
    )
    conn.commit()
    conn.close()

    body = _make_webhook_body(invoice_id, "failed")
    sign = _sign_body(body, "test_secret")

    resp = client.post(
        "/api/payments/crypto/webhook",
        content=body,
        headers={"sign": sign, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    conn = sqlite3.connect(TEST_DB_PATH, timeout=10)
    row = conn.execute(
        "SELECT status FROM cryptomus_payments WHERE invoice_id = ?", (invoice_id,)
    ).fetchone()
    conn.close()
    assert row is not None
    assert row[0] == "failed"


def test_payment_status_success(client, monkeypatch, admin):
    user = _fixed_user
    invoice_id = "inv-status-1"
    conn = sqlite3.connect(TEST_DB_PATH, timeout=10)
    conn.execute(
        """
        INSERT INTO cryptomus_payments
        (id, user_id, invoice_id, order_id, plan, network, amount_usd, currency,
         status, payment_address, qr_code_url, expires_at, paid_amount, paid_currency, issued_api_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "pay-status",
            user["id"],
            invoice_id,
            "ord-status",
            "pro",
            "TRC20",
            99.99,
            "USDT",
            "TTestAddress123",
            "https://example.com/qr.png",
            "2026-07-21T10:30:00Z",
            "99.99",
            "USDT",
            "tm_raw_key_abc",
            "2026-07-21T09:00:00Z",
        ),
    )
    conn.commit()
    conn.close()

    resp = client.get(
        f"/api/payments/crypto/status/{invoice_id}",
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["status"] == "paid"
    assert data["api_key"] == "tm_raw_key_abc"
