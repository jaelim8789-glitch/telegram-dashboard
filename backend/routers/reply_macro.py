"""
Reply Macro API endpoints — Runtime 기반, reply_to_msg_id 100% 보장.

Features:
- Full CRUD with SQLite persistence
- Runtime-based execution via BroadcastQueue (reply_to_message_id guaranteed)
- Interval and fixed-time scheduling
- Per-macro daily send limits
- Execution logs with reply tracking
- Broadcast/AutoReply full compatibility
"""

from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models import ReplyMacro, ReplyMacroLog
from ..runtime_manager import RuntimeManager

logger = logging.getLogger(__name__)

router = APIRouter()

DB_PATH = "data/runtime.db"


# ─── Pydantic Models ─────────────────────────────────────────────────


class MacroCreate(BaseModel):
    name: str
    target_chats: list[str] = []
    message_content: str = ""
    schedule_type: str = "interval"
    interval_hours: int = 24
    fixed_time: str | None = None
    max_sends_per_day: int = 10
    is_active: bool = True
    reply_to_message_id: int | None = None


class MacroUpdate(BaseModel):
    name: str | None = None
    target_chats: list[str] | None = None
    message_content: str | None = None
    schedule_type: str | None = None
    interval_hours: int | None = None
    fixed_time: str | None = None
    max_sends_per_day: int | None = None
    is_active: bool | None = None
    reply_to_message_id: int | None = None


# ─── DB Helpers ──────────────────────────────────────────────────────


def _init_macros_db() -> None:
    import os
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reply_macros (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            name TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            target_chats TEXT DEFAULT '[]',
            message_content TEXT DEFAULT '',
            media_path TEXT,
            schedule_type TEXT DEFAULT 'interval',
            interval_hours INTEGER DEFAULT 24,
            fixed_time TEXT,
            max_sends_per_day INTEGER DEFAULT 10,
            reply_to_message_id INTEGER,
            last_sent_at TEXT,
            created_at TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reply_macro_logs (
            id TEXT PRIMARY KEY,
            macro_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            target_chat_id TEXT NOT NULL,
            message_sent TEXT DEFAULT '',
            status TEXT DEFAULT '',
            error_message TEXT,
            reply_to_message_id INTEGER,
            created_at TEXT DEFAULT ''
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_macro_logs_macro ON reply_macro_logs(macro_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_macro_logs_account ON reply_macro_logs(account_id)")
    conn.commit()
    conn.close()


def _macro_row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "account_id": row["account_id"],
        "name": row["name"],
        "is_active": bool(row["is_active"]),
        "target_chats": json.loads(row["target_chats"]) if isinstance(row["target_chats"], str) else (row["target_chats"] or []),
        "message_content": row["message_content"],
        "media_path": row["media_path"],
        "schedule_type": row["schedule_type"],
        "interval_hours": row["interval_hours"],
        "fixed_time": row["fixed_time"],
        "max_sends_per_day": row["max_sends_per_day"],
        "reply_to_message_id": row["reply_to_message_id"],
        "last_sent_at": row["last_sent_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _log_row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "macro_id": row["macro_id"],
        "account_id": row["account_id"],
        "target_chat_id": row["target_chat_id"],
        "message_sent": row["message_sent"],
        "status": row["status"],
        "error_message": row["error_message"],
        "reply_to_message_id": row["reply_to_message_id"],
        "created_at": row["created_at"],
    }


# ─── Router: Reply Macro CRUD ───────────────────────────────────────


@router.get("/accounts/{account_id}/reply-macros", response_model=list[ReplyMacro])
async def get_reply_macros(account_id: str):
    """Get all reply macros for an account (from DB)."""
    _init_macros_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        "SELECT * FROM reply_macros WHERE account_id = ? ORDER BY created_at DESC",
        (account_id,),
    )
    rows = [_macro_row_to_dict(row) for row in cursor.fetchall()]
    conn.close()

    # Sync with RuntimeManager
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if runtime:
        runtime.reply_macro.set_macros([ReplyMacro(**r) for r in rows])

    return rows


@router.post("/accounts/{account_id}/reply-macros", response_model=ReplyMacro)
async def create_reply_macro(account_id: str, body: MacroCreate):
    """Create a new reply macro with DB persistence."""
    _init_macros_db()
    now = datetime.now(timezone.utc).isoformat()
    macro_id = str(uuid.uuid4())

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    conn.execute(
        """INSERT INTO reply_macros
           (id, account_id, name, is_active, target_chats, message_content,
            media_path, schedule_type, interval_hours, fixed_time,
            max_sends_per_day, reply_to_message_id, last_sent_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)""",
        (macro_id, account_id, body.name, 1 if body.is_active else 0,
         json.dumps(body.target_chats), body.message_content, None,
         body.schedule_type, body.interval_hours, body.fixed_time,
         body.max_sends_per_day, body.reply_to_message_id, now, now),
    )
    conn.commit()

    cursor = conn.execute("SELECT * FROM reply_macros WHERE id = ?", (macro_id,))
    result = _macro_row_to_dict(cursor.fetchone())
    conn.close()

    # Sync to Runtime
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if runtime:
        macros = runtime.reply_macro.get_macros() + [ReplyMacro(**result)]
        runtime.reply_macro.set_macros(macros)

    logger.info("[%s] Reply macro created: %s (%s)", account_id, body.name, macro_id)
    return result


@router.put("/accounts/{account_id}/reply-macros/{macro_id}", response_model=ReplyMacro)
async def update_reply_macro(account_id: str, macro_id: str, body: MacroUpdate):
    """Update a reply macro."""
    _init_macros_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    cursor = conn.execute(
        "SELECT * FROM reply_macros WHERE id = ? AND account_id = ?",
        (macro_id, account_id),
    )
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Reply macro not found")

    now = datetime.now(timezone.utc).isoformat()
    updates: list[str] = []
    params: list[Any] = []

    if body.name is not None:
        updates.append("name = ?")
        params.append(body.name)
    if body.target_chats is not None:
        updates.append("target_chats = ?")
        params.append(json.dumps(body.target_chats))
    if body.message_content is not None:
        updates.append("message_content = ?")
        params.append(body.message_content)
    if body.schedule_type is not None:
        updates.append("schedule_type = ?")
        params.append(body.schedule_type)
    if body.interval_hours is not None:
        updates.append("interval_hours = ?")
        params.append(body.interval_hours)
    if body.fixed_time is not None:
        updates.append("fixed_time = ?")
        params.append(body.fixed_time)
    if body.max_sends_per_day is not None:
        updates.append("max_sends_per_day = ?")
        params.append(body.max_sends_per_day)
    if body.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if body.is_active else 0)
    if body.reply_to_message_id is not None:
        updates.append("reply_to_message_id = ?")
        params.append(body.reply_to_message_id)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.extend([macro_id, account_id])
        conn.execute(
            f"UPDATE reply_macros SET {', '.join(updates)} WHERE id = ? AND account_id = ?",
            params,
        )
        conn.commit()

    cursor = conn.execute("SELECT * FROM reply_macros WHERE id = ?", (macro_id,))
    result = _macro_row_to_dict(cursor.fetchone())
    conn.close()

    # Sync to Runtime
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if runtime:
        macros = runtime.reply_macro.get_macros()
        for i, m in enumerate(macros):
            if m.id == macro_id:
                macros[i] = ReplyMacro(**result)
                break
        runtime.reply_macro.set_macros(macros)

    return result


@router.delete("/accounts/{account_id}/reply-macros/{macro_id}")
async def delete_reply_macro(account_id: str, macro_id: str):
    """Delete a reply macro."""
    _init_macros_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT id FROM reply_macros WHERE id = ? AND account_id = ?",
        (macro_id, account_id),
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Reply macro not found")

    conn.execute("DELETE FROM reply_macros WHERE id = ? AND account_id = ?", (macro_id, account_id))
    conn.commit()
    conn.close()

    # Remove from Runtime
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if runtime:
        macros = [m for m in runtime.reply_macro.get_macros() if m.id != macro_id]
        runtime.reply_macro.set_macros(macros)

    logger.info("[%s] Reply macro deleted: %s", account_id, macro_id)
    return {"status": "deleted"}


@router.post("/accounts/{account_id}/reply-macros/{macro_id}/execute")
async def execute_reply_macro(account_id: str, macro_id: str):
    """Execute a reply macro immediately via BroadcastQueue (reply_to_msg_id guaranteed)."""
    _init_macros_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        "SELECT * FROM reply_macros WHERE id = ? AND account_id = ?",
        (macro_id, account_id),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Reply macro not found")

    macro = ReplyMacro(**(_macro_row_to_dict(row)))

    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Account runtime not found")

    # Execute via BroadcastQueue for guaranteed reply_to_message_id support
    from ..models import CreateBroadcastInput

    success_count = 0
    fail_count = 0
    for target_chat_id in macro.target_chats:
        try:
            broadcast_input = CreateBroadcastInput(
                account_id=account_id,
                message=macro.message_content,
                recipients=[target_chat_id],
                delivery_mode="reply" if macro.reply_to_message_id else "normal",
                reply_to_message_id=macro.reply_to_message_id,
            )
            broadcast = await manager.create_broadcast(broadcast_input)
            success_count += 1

            # Log the execution
            _log_execution(account_id, macro_id, target_chat_id,
                           macro.message_content, "sent",
                           macro.reply_to_message_id)

        except Exception as e:
            fail_count += 1
            _log_execution(account_id, macro_id, target_chat_id,
                           macro.message_content, "failed",
                           macro.reply_to_message_id, str(e))
            logger.warning("[%s] Macro %s failed for %s: %s",
                          account_id, macro_id, target_chat_id, e)

    # Update last_sent_at
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE reply_macros SET last_sent_at = ? WHERE id = ?",
        (now, macro_id),
    )
    conn.commit()
    conn.close()

    return {
        "status": "executed",
        "success_count": success_count,
        "fail_count": fail_count,
        "total": len(macro.target_chats),
    }


@router.get("/accounts/{account_id}/reply-macros/{macro_id}/logs", response_model=list[ReplyMacroLog])
async def get_reply_macro_logs(account_id: str, macro_id: str):
    """Get execution logs for a reply macro."""
    _init_macros_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        "SELECT * FROM reply_macro_logs WHERE macro_id = ? AND account_id = ? ORDER BY created_at DESC LIMIT 200",
        (macro_id, account_id),
    )
    rows = [_log_row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


# ─── Internal Helpers ───────────────────────────────────────────────


def _log_execution(
    account_id: str,
    macro_id: str,
    target_chat_id: str,
    message_sent: str,
    status: str,
    reply_to_message_id: int | None = None,
    error_message: str | None = None,
) -> None:
    """Persist a macro execution log entry."""
    _init_macros_db()
    log_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """INSERT INTO reply_macro_logs
           (id, macro_id, account_id, target_chat_id, message_sent, status, error_message, reply_to_message_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (log_id, macro_id, account_id, target_chat_id, message_sent,
         status, error_message, reply_to_message_id, now),
    )
    conn.commit()
    conn.close()