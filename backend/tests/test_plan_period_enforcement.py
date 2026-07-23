"""
Tests for the plan-limit policy change: message/send count ceilings are
relaxed to ~99999 across every plan, and the real access gate becomes
period-based (trial expiry, paid-subscription current_period_end) via
AdminPlatform.check_trial_status() / check_subscription_status(),
wired into auth_middleware.get_current_user().

Runs against an isolated admin.db (ADMIN_DB_PATH override + module reload) --
never touches the real data/admin.db or data/sessions.db.
"""

from __future__ import annotations

import importlib
import inspect
import os
from datetime import datetime, timedelta, timezone

import pytest

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "_tmp_plan_period_test.db")


@pytest.fixture()
def admin(monkeypatch):
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    monkeypatch.setenv("ADMIN_DB_PATH", TEST_DB_PATH)

    import backend.admin_platform as ap
    importlib.reload(ap)
    ap.AdminPlatform._instance = None
    instance = ap.AdminPlatform.get_instance()
    yield instance

    ap.AdminPlatform._instance = None
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _backdate_trial(admin, user_id: str, when: datetime) -> None:
    conn = admin.db._get_conn()
    conn.execute("UPDATE users SET trial_ends_at = ? WHERE id = ?", (when.isoformat(), user_id))
    conn.commit()
    conn.close()


def _backdate_subscription(admin, sub_id: str, when: datetime) -> None:
    conn = admin.db._get_conn()
    conn.execute("UPDATE subscriptions SET current_period_end = ? WHERE id = ?", (when.isoformat(), sub_id))
    conn.commit()
    conn.close()


def test_plan_message_limits_are_relaxed(admin) -> None:
    from backend.admin_platform import PLANS, Plan

    for plan_name, plan_def in PLANS.items():
        assert plan_def.daily_send_limit >= 99999, f"{plan_name} daily_send_limit not relaxed"
        assert plan_def.daily_auto_reply_limit >= 99999, f"{plan_name} daily_auto_reply_limit not relaxed"

    # FREE/PRO/TEAM bumped to 99999; LIFETIME's 0 (already unlimited) is left alone, not reduced.
    assert PLANS[Plan.FREE].daily_limit == 99999
    assert PLANS[Plan.PRO].daily_limit == 99999
    assert PLANS[Plan.TEAM].daily_limit == 99999
    assert PLANS[Plan.LIFETIME].daily_limit == 0


def test_new_user_trial_starts_on_pro(admin) -> None:
    from backend.admin_platform import Plan

    user = admin.create_user("alice", "pw123456")
    assert admin.get_user(user["id"])["plan"] == Plan.PRO
    assert admin.get_user(user["id"])["trial_ends_at"] is not None


def test_trial_not_expired_keeps_plan(admin) -> None:
    from backend.admin_platform import Plan

    user = admin.create_user("bob", "pw123456")
    result = admin.check_trial_status(user["id"])
    assert result["is_expired"] is False
    assert admin.get_user(user["id"])["plan"] == Plan.PRO


def test_trial_expired_downgrades_to_free(admin) -> None:
    from backend.admin_platform import Plan

    user = admin.create_user("carol", "pw123456")
    user_id = user["id"]
    assert admin.get_user(user_id)["plan"] == Plan.PRO

    _backdate_trial(admin, user_id, datetime.now(timezone.utc) - timedelta(days=1))

    result = admin.check_trial_status(user_id)
    assert result["is_expired"] is True
    assert admin.get_user(user_id)["plan"] == Plan.FREE


def test_no_subscription_is_noop(admin) -> None:
    from backend.admin_platform import Plan

    user = admin.create_user("dave", "pw123456", plan=Plan.PRO)
    result = admin.check_subscription_status(user["id"])
    assert result["has_subscription"] is False
    assert admin.get_user(user["id"])["plan"] == Plan.PRO


def test_active_subscription_keeps_plan(admin) -> None:
    from backend.admin_platform import Plan

    user = admin.create_user("erin", "pw123456", plan=Plan.PRO)
    admin.create_subscription(user["id"], Plan.PRO)  # current_period_end = now + 30d

    result = admin.check_subscription_status(user["id"])
    assert result["is_expired"] is False
    assert admin.get_user(user["id"])["plan"] == Plan.PRO


def test_lapsed_subscription_downgrades_to_free(admin) -> None:
    from backend.admin_platform import Plan

    user = admin.create_user("frank", "pw123456", plan=Plan.PRO)
    user_id = user["id"]
    sub = admin.create_subscription(user_id, Plan.PRO)
    _backdate_subscription(admin, sub["id"], datetime.now(timezone.utc) - timedelta(days=1))

    result = admin.check_subscription_status(user_id)
    assert result["is_expired"] is True
    assert admin.get_user(user_id)["plan"] == Plan.FREE


def test_get_current_user_wires_in_period_checks() -> None:
    """Regression guard: the session-token auth path must call both period
    checks on every request. Source-level check only -- exercising this
    end-to-end would require writing to the real data/sessions.db, which
    this test suite intentionally never touches."""
    from backend import auth_middleware

    src = inspect.getsource(auth_middleware.get_current_user)
    assert "check_trial_status" in src
    assert "check_subscription_status" in src
