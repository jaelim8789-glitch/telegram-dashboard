"""
Bot-owned SQLite tables.

Additive only: these tables live inside the existing admin.db file
(same file AdminPlatform and free_api_key already use) but are created
via CREATE TABLE IF NOT EXISTS and never alter an existing table's
schema. Nothing in this module touches runtime.db (accounts, broadcasts,
auto_reply_rules, reply_macros) — that stays fully owned by the
Telethon account runtime.
"""

from __future__ import annotations

import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

DB_PATH = os.environ.get("ADMIN_DB_PATH", "data/admin.db")


def init_bot_tables() -> None:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bot_sessions (
                chat_id TEXT PRIMARY KEY,
                token TEXT NOT NULL,
                telegram_user_id INTEGER,
                telegram_username TEXT,
                created_at TEXT DEFAULT '',
                updated_at TEXT DEFAULT ''
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bot_admin_notify_log (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                message TEXT DEFAULT '',
                delivered INTEGER DEFAULT 0,
                created_at TEXT DEFAULT ''
            )
        """)
        conn.commit()
    finally:
        conn.close()


def upsert_session(
    chat_id: str,
    token: str,
    telegram_user_id: int | None = None,
    telegram_username: str | None = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        conn.execute(
            """INSERT INTO bot_sessions (chat_id, token, telegram_user_id, telegram_username, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(chat_id) DO UPDATE SET
                 token = excluded.token,
                 telegram_user_id = excluded.telegram_user_id,
                 telegram_username = excluded.telegram_username,
                 updated_at = excluded.updated_at""",
            (chat_id, token, telegram_user_id, telegram_username, now, now),
        )
        conn.commit()
    finally:
        conn.close()


def get_session(chat_id: str) -> dict[str, Any] | None:
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT * FROM bot_sessions WHERE chat_id = ?", (chat_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def log_admin_notify(event_type: str, message: str, delivered: bool) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        conn.execute(
            """INSERT INTO bot_admin_notify_log (id, event_type, message, delivered, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (str(uuid.uuid4()), event_type, message, 1 if delivered else 0, now),
        )
        conn.commit()
    finally:
        conn.close()
