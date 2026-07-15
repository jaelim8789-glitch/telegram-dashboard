"""
E2E Test Configuration — loads Telegram account credentials and test parameters.

Supports multiple test accounts defined via environment variables or a JSON config file.

Environment variables (per account, up to ACCOUNT_COUNT):
  E2E_ACCOUNT_1_PHONE, E2E_ACCOUNT_1_API_ID, E2E_ACCOUNT_1_API_HASH, E2E_ACCOUNT_1_NAME
  E2E_ACCOUNT_2_PHONE, E2E_ACCOUNT_2_API_ID, E2E_ACCOUNT_2_API_HASH, E2E_ACCOUNT_2_NAME
  ...
  E2E_ACCOUNT_COUNT          — number of test accounts (default: 2)
  E2E_BASE_URL               — backend URL (default: http://localhost:8000)
  E2E_TARGET_CHAT_ID         — test chat ID to send messages to
  E2E_TEST_TIMEOUT           — per-test timeout in seconds (default: 60)
  E2E_PERF_MESSAGE_COUNT     — messages per perf test (default: 10)
  E2E_REPORT_PATH            — output report path (default: e2e/report.json)
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field
from typing import Any


@dataclass
class TelegramAccount:
    phone: str
    api_id: int
    api_hash: str
    name: str = ""


@dataclass
class E2EConfig:
    accounts: list[TelegramAccount] = field(default_factory=list)
    base_url: str = "http://localhost:8000"
    target_chat_id: str = ""
    test_timeout: int = 60
    perf_message_count: int = 10
    report_path: str = "e2e/report.json"
    admin_username: str = "123123"
    admin_password: str = "123456"

    @property
    def api_url(self) -> str:
        return f"{self.base_url}/api"


def load_config() -> E2EConfig:
    """Load configuration from environment variables or config file."""
    config = E2EConfig()

    # Override from env
    if url := os.environ.get("E2E_BASE_URL"):
        config.base_url = url
    if chat_id := os.environ.get("E2E_TARGET_CHAT_ID"):
        config.target_chat_id = chat_id
    if timeout := os.environ.get("E2E_TEST_TIMEOUT"):
        config.test_timeout = int(timeout)
    if count := os.environ.get("E2E_PERF_MESSAGE_COUNT"):
        config.perf_message_count = int(count)
    if report := os.environ.get("E2E_REPORT_PATH"):
        config.report_path = report
    if admin_user := os.environ.get("E2E_ADMIN_USERNAME"):
        config.admin_username = admin_user
    if admin_pass := os.environ.get("E2E_ADMIN_PASSWORD"):
        config.admin_password = admin_pass

    # Load accounts from environment
    account_count = int(os.environ.get("E2E_ACCOUNT_COUNT", "2"))
    for i in range(1, account_count + 1):
        phone = os.environ.get(f"E2E_ACCOUNT_{i}_PHONE", "")
        api_id_str = os.environ.get(f"E2E_ACCOUNT_{i}_API_ID", "0")
        api_hash = os.environ.get(f"E2E_ACCOUNT_{i}_API_HASH", "")
        name = os.environ.get(f"E2E_ACCOUNT_{i}_NAME", f"E2E Test Account {i}")

        if not phone or not api_hash:
            print(f"[WARN] E2E_ACCOUNT_{i} incomplete (phone={phone!r}, hash={'set' if api_hash else 'empty'}) — skipping")
            continue

        try:
            api_id = int(api_id_str)
        except ValueError:
            print(f"[WARN] E2E_ACCOUNT_{i} invalid API_ID={api_id_str!r} — skipping")
            continue

        config.accounts.append(TelegramAccount(
            phone=phone,
            api_id=api_id,
            api_hash=api_hash,
            name=name,
        ))

    if not config.accounts:
        print("[WARN] No Telegram accounts configured. Set E2E_ACCOUNT_1_PHONE, E2E_ACCOUNT_1_API_ID, E2E_ACCOUNT_1_API_HASH")
        print("       or use a JSON config file via E2E_CONFIG_PATH.")

    return config


CONFIG: E2EConfig = load_config()