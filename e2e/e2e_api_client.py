"""
E2E API Client — typed wrapper around the TeleMon backend REST API.

Provides helper methods that all test suites can use, with automatic
admin token management and proper error handling.
"""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import urllib.error
import urllib.request
import urllib.parse

from .e2e_config import CONFIG, TelegramAccount


class E2EApiError(Exception):
    """Raised when an API call fails unexpectedly."""

    def __init__(self, label: str, status: int, body: str) -> None:
        self.label = label
        self.status = status
        self.body = body
        super().__init__(f"[{label}] HTTP {status}: {body[:200]}")


class E2ETestFailure(Exception):
    """Raised when a test assertion fails."""

    def __init__(self, test_name: str, reason: str, detail: str = "") -> None:
        self.test_name = test_name
        self.reason = reason
        self.detail = detail
        super().__init__(f"[{test_name}] FAIL: {reason}")


class E2EApiClient:
    """HTTP client for the TeleMon backend with automatic auth."""

    def __init__(self) -> None:
        self.base_url = CONFIG.base_url
        self.api_url = CONFIG.api_url
        self._admin_token: str | None = None
        self._token_expires_at: float = 0

    # ── Auth ──────────────────────────────────────────────────────────

    def _ensure_token(self) -> str:
        """Get a valid admin token, refreshing if needed."""
        if self._admin_token and time.time() < self._token_expires_at - 60:
            return self._admin_token

        url = f"{self.api_url}/admin/login"
        body = json.dumps({
            "username": CONFIG.admin_username,
            "password": CONFIG.admin_password,
        }).encode()
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        try:
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            self._admin_token = data.get("access_token", "")
            self._token_expires_at = time.time() + 3600
        except urllib.error.HTTPError as e:
            raise E2EApiError("admin-login", e.code, e.read().decode()[:300])
        except Exception as e:
            raise E2EApiError("admin-login", 0, str(e))

        return self._admin_token or ""

    def _headers(self) -> dict[str, str]:
        token = self._ensure_token()
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

    # ── HTTP Methods ─────────────────────────────────────────────────

    def _request(
        self,
        method: str,
        path: str,
        body: Any = None,
        expected_status: int | None = None,
        label: str = "",
    ) -> tuple[int, Any]:
        """Make an HTTP request and return (status_code, parsed_body)."""
        url = f"{self.api_url}{path}" if not path.startswith("http") else path
        data = json.dumps(body).encode() if body is not None else None

        req = urllib.request.Request(url, data=data, method=method)
        for k, v in self._headers().items():
            req.add_header(k, v)

        try:
            resp = urllib.request.urlopen(req, timeout=CONFIG.test_timeout)
            status = resp.status
            resp_body = resp.read()
            parsed = json.loads(resp_body) if resp_body else {}
        except urllib.error.HTTPError as e:
            status = e.code
            parsed = e.read().decode("utf-8", errors="replace")[:500]
        except Exception as e:
            raise E2EApiError(label or f"{method} {path}", 0, str(e))

        if expected_status is not None and status != expected_status:
            raise E2EApiError(
                label or f"{method} {path}",
                status,
                f"Expected {expected_status}, got {status}: {parsed}",
            )

        return status, parsed

    def get(self, path: str, expected_status: int | None = 200, label: str = "") -> Any:
        _, data = self._request("GET", path, expected_status=expected_status, label=label or f"GET {path}")
        return data

    def post(self, path: str, body: Any = None, expected_status: int | None = 200, label: str = "") -> Any:
        _, data = self._request("POST", path, body=body, expected_status=expected_status, label=label or f"POST {path}")
        return data

    def put(self, path: str, body: Any = None, expected_status: int | None = 200, label: str = "") -> Any:
        _, data = self._request("PUT", path, body=body, expected_status=expected_status, label=label or f"PUT {path}")
        return data

    def delete(self, path: str, expected_status: int | None = 200, label: str = "") -> Any:
        _, data = self._request("DELETE", path, expected_status=expected_status, label=label or f"DELETE {path}")
        return data

    # ── Health Check ─────────────────────────────────────────────────

    def health_check(self) -> dict[str, Any]:
        """Check that the backend is alive."""
        # The root endpoint is at BASE_URL/, not BASE_URL/api/
        url = f"{self.base_url}/"
        req = urllib.request.Request(url)
        try:
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            return data
        except urllib.error.HTTPError as e:
            raise E2EApiError("health-check", e.code, e.read().decode()[:300])
        except Exception as e:
            raise E2EApiError("health-check", 0, str(e))

    # ── Account Operations ───────────────────────────────────────────

    def list_accounts(self) -> list[dict[str, Any]]:
        """List all registered accounts."""
        data = self.get("/accounts", label="list_accounts")
        return data.get("items", [])

    def create_account(self, phone: str, name: str = "", api_id: int = 0, api_hash: str = "") -> dict[str, Any]:
        """Create a new Telegram account runtime."""
        body: dict[str, Any] = {"phone": phone}
        if name:
            body["name"] = name
        if api_id and api_hash:
            body["api_id"] = api_id
            body["api_hash"] = api_hash
        return self.post("/accounts", body=body, label="create_account")

    def delete_account(self, account_id: str) -> dict[str, Any]:
        """Delete an account and its runtime."""
        return self.delete(f"/accounts/{account_id}", label="delete_account")

    def get_account(self, account_id: str) -> dict[str, Any]:
        """Get a single account by ID."""
        return self.get(f"/accounts/{account_id}", label="get_account")

    # ── Account Health ───────────────────────────────────────────────

    def get_account_health(self, account_id: str) -> dict[str, Any]:
        """Get health status for a single account."""
        return self.get(f"/accounts/{account_id}/health", label="get_account_health")

    def list_health(self) -> list[dict[str, Any]]:
        """Get health for all accounts."""
        data = self.get("/account-health", label="list_health")
        if isinstance(data, list):
            return data
        return data.get("items", [])

    # ── Auto-Reply ───────────────────────────────────────────────────

    def get_auto_reply_settings(self, account_id: str) -> dict[str, Any]:
        return self.get(f"/accounts/{account_id}/auto-reply", label="get_auto_reply_settings")

    def create_auto_reply_rule(self, account_id: str, rule: dict[str, Any]) -> dict[str, Any]:
        return self.post(f"/accounts/{account_id}/auto-reply", body=rule, label="create_auto_reply_rule")

    def update_auto_reply_rule(self, account_id: str, rule_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        return self.put(f"/accounts/{account_id}/auto-reply/{rule_id}", body=updates, label="update_auto_reply_rule")

    def delete_auto_reply_rule(self, account_id: str, rule_id: str) -> dict[str, Any]:
        return self.delete(f"/accounts/{account_id}/auto-reply/{rule_id}", label="delete_auto_reply_rule")

    def toggle_auto_reply(self, account_id: str, enabled: bool) -> dict[str, Any]:
        return self.post(f"/accounts/{account_id}/auto-reply/toggle", body={"enabled": enabled}, label="toggle_auto_reply")

    def get_auto_reply_logs(self, account_id: str) -> list[dict[str, Any]]:
        return self.get(f"/accounts/{account_id}/auto-reply/logs", label="get_auto_reply_logs")

    # ── Reply Macros ─────────────────────────────────────────────────

    def get_reply_macros(self, account_id: str) -> list[dict[str, Any]]:
        return self.get(f"/accounts/{account_id}/reply-macros", label="get_reply_macros")

    def create_reply_macro(self, account_id: str, macro: dict[str, Any]) -> dict[str, Any]:
        return self.post(f"/accounts/{account_id}/reply-macros", body=macro, label="create_reply_macro")

    def update_reply_macro(self, account_id: str, macro_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        return self.put(f"/accounts/{account_id}/reply-macros/{macro_id}", body=updates, label="update_reply_macro")

    def delete_reply_macro(self, account_id: str, macro_id: str) -> dict[str, Any]:
        return self.delete(f"/accounts/{account_id}/reply-macros/{macro_id}", label="delete_reply_macro")

    def execute_reply_macro(self, account_id: str, macro_id: str) -> dict[str, Any]:
        return self.post(f"/accounts/{account_id}/reply-macros/{macro_id}/execute", label="execute_reply_macro")

    def get_reply_macro_logs(self, account_id: str, macro_id: str) -> list[dict[str, Any]]:
        return self.get(f"/accounts/{account_id}/reply-macros/{macro_id}/logs", label="get_reply_macro_logs")

    # ── Broadcast ────────────────────────────────────────────────────

    def create_broadcast(self, broadcast: dict[str, Any]) -> dict[str, Any]:
        return self.post("/broadcast", body=broadcast, label="create_broadcast")

    def cancel_broadcast(self, broadcast_id: str) -> dict[str, Any]:
        return self.post(f"/broadcast/{broadcast_id}/cancel", label="cancel_broadcast")

    # ── Runtime Inspector ────────────────────────────────────────────

    def get_runtime_inspector(self, account_id: str) -> dict[str, Any]:
        return self.get(f"/runtime/inspector/{account_id}", label="get_runtime_inspector")

    def get_runtime_inspector_summary(self) -> dict[str, Any]:
        return self.get("/runtime/inspector", label="get_runtime_inspector_summary")

    def trigger_recovery(self, account_id: str) -> dict[str, Any]:
        return self.post(f"/runtime/inspector/{account_id}/recover", label="trigger_recovery")

    def restart_runtime(self, account_id: str) -> dict[str, Any]:
        return self.post(f"/runtime/inspector/{account_id}/restart", label="restart_runtime")

    # ── Groups ───────────────────────────────────────────────────────

    def get_groups(self, account_id: str) -> list[dict[str, Any]]:
        return self.get(f"/accounts/{account_id}/groups", label="get_groups")

    def get_group_folders(self, account_id: str) -> list[dict[str, Any]]:
        return self.get(f"/accounts/{account_id}/groups/folders", label="get_group_folders")

    # ── Logs ─────────────────────────────────────────────────────────

    def get_logs(self) -> list[dict[str, Any]]:
        return self.get("/logs", label="get_logs")


# Singleton client for all tests to use
CLIENT = E2EApiClient()