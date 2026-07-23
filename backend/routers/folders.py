"""
Folder Management Router — Runtime 기반 계정별 폴더 관리, 계층 구조, 스마트 폴더.

Features:
- Custom folder CRUD (per-account, persisted in SQLite) with nested hierarchy (parent_id)
- Smart folders: recent activity, unsent, VIP, auto-classify
- Drag & drop reorder (sort_order update)
- Batch move groups between folders
- Folder-based broadcast (resolve folder → group IDs → send)
- Multi-folder selection for send
- Workspace state sync (folder order, collapse state, pinned folders)
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

from ..runtime_manager import RuntimeManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/accounts/{account_id}/folders", tags=["folders"])

DB_PATH = "data/runtime.db"


# ─── Pydantic Models ─────────────────────────────────────────────────


class FolderCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"
    icon: str = "folder"
    group_ids: list[str] = []
    parent_id: str | None = None


class FolderUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    group_ids: list[str] | None = None
    order: int | None = None
    parent_id: str | None = None
    is_collapsed: bool | None = None


class FolderResponse(BaseModel):
    id: str
    account_id: str
    name: str
    description: str
    color: str
    icon: str
    group_ids: list[str]
    order: int
    parent_id: str | None = None
    is_collapsed: bool = False
    is_smart: bool = False
    smart_type: str | None = None
    created_at: str
    updated_at: str
    children: list[dict] | None = None


class BatchMoveInput(BaseModel):
    source_folder_id: str | None = None
    target_folder_id: str | None = None
    group_ids: list[str]


class FolderSendInput(BaseModel):
    folder_ids: list[str]
    message: str
    exclude_group_ids: list[str] = []


class FolderReorderInput(BaseModel):
    folder_id: str
    order: int
    parent_id: str | None = None


class SmartFolderConfig(BaseModel):
    name: str
    smart_type: str
    color: str = "#22c55e"
    icon: str = "sparkles"
    description: str = ""
    group_ids: list[str] = []
    params: dict[str, Any] = {}


# ─── DB Helpers ──────────────────────────────────────────────────────


def _init_folders_db() -> None:
    import os
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            color TEXT DEFAULT '#6366f1',
            icon TEXT DEFAULT 'folder',
            group_ids TEXT DEFAULT '[]',
            sort_order INTEGER DEFAULT 0,
            parent_id TEXT DEFAULT NULL,
            is_collapsed INTEGER DEFAULT 0,
            is_smart INTEGER DEFAULT 0,
            smart_type TEXT DEFAULT NULL,
            smart_params TEXT DEFAULT '{}',
            created_at TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_folders_account ON folders(account_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)")
    conn.commit()
    conn.close()


def _folder_row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "account_id": row["account_id"],
        "name": row["name"],
        "description": row["description"],
        "color": row["color"],
        "icon": row["icon"],
        "group_ids": json.loads(row["group_ids"]) if isinstance(row["group_ids"], str) else (row["group_ids"] or []),
        "order": row["sort_order"],
        "parent_id": row["parent_id"],
        "is_collapsed": bool(row["is_collapsed"]),
        "is_smart": bool(row["is_smart"]),
        "smart_type": row["smart_type"],
        "smart_params": json.loads(row["smart_params"]) if isinstance(row["smart_params"], str) else {},
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _build_folder_tree(folders: list[dict]) -> list[dict]:
    folder_map: dict[str, dict] = {}
    roots: list[dict] = []
    for f in folders:
        f_copy = dict(f)
        f_copy["children"] = []
        folder_map[f_copy["id"]] = f_copy
    for f in folder_map.values():
        parent_id = f.get("parent_id")
        if parent_id and parent_id in folder_map:
            folder_map[parent_id]["children"].append(f)
        else:
            roots.append(f)
    for f in folder_map.values():
        if f["children"]:
            f["children"].sort(key=lambda x: x["order"])
    roots.sort(key=lambda x: x["order"])
    return roots


# ─── Smart Folder Logic ──────────────────────────────────────────────


async def _compute_smart_folder_groups(
    account_id: str, smart_type: str, params: dict[str, Any],
) -> list[str]:
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        return []
    groups = runtime.group_cache.get_all()
    broadcasts = runtime.get_broadcasts(100)

    if smart_type == "recent_activity":
        hours = params.get("hours", 24)
        cutoff = datetime.now(timezone.utc).timestamp() - (hours * 3600)
        active_group_ids: set[str] = set()
        for b in broadcasts:
            if b.status == "sent" and b.sent_at:
                try:
                    sent_ts = datetime.fromisoformat(b.sent_at).timestamp()
                    if sent_ts > cutoff:
                        for r in b.recipients:
                            if r.startswith("-100") or r.startswith("-"):
                                active_group_ids.add(r)
                except (ValueError, TypeError):
                    pass
        return [g.id for g in groups if g.id in active_group_ids][:50]

    elif smart_type == "unsent":
        sent_group_ids: set[str] = set()
        failed_group_ids: set[str] = set()
        for b in broadcasts:
            for r in b.recipients:
                if b.status == "sent":
                    sent_group_ids.add(r)
                elif b.status == "failed":
                    failed_group_ids.add(r)
        never_sent = [g.id for g in groups if g.id not in sent_group_ids]
        only_failed = [g.id for g in groups if g.id in failed_group_ids and g.id not in sent_group_ids]
        return (never_sent + only_failed)[:100]

    elif smart_type == "vip":
        vip_ids = set(params.get("vip_group_ids", []))
        if vip_ids:
            return [g.id for g in groups if g.id in vip_ids]
        sent_counts: dict[str, int] = {}
        for b in broadcasts:
            if b.status == "sent":
                for r in b.recipients:
                    sent_counts[r] = sent_counts.get(r, 0) + 1
        sorted_groups = sorted(sent_counts.items(), key=lambda x: x[1], reverse=True)
        return [gid for gid, _ in sorted_groups[:20]]

    elif smart_type == "auto_classify":
        keywords = [k.lower() for k in params.get("keywords", [])]
        exclude_ids = set(params.get("exclude_group_ids", []))
        if not keywords:
            return []
        matched = []
        for g in groups:
            if g.id in exclude_ids:
                continue
            title_lower = g.title.lower()
            if any(kw in title_lower for kw in keywords):
                matched.append(g.id)
        return matched[:100]

    return []


# ─── Router: Custom Folders CRUD ────────────────────────────────────


@router.get("", response_model=list[FolderResponse])
async def list_folders(account_id: str, tree: bool = False):
    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        "SELECT * FROM folders WHERE account_id = ? ORDER BY sort_order ASC, name ASC",
        (account_id,),
    )
    rows = [_folder_row_to_dict(row) for row in cursor.fetchall()]
    conn.close()

    for folder in rows:
        if folder.get("is_smart") and folder.get("smart_type"):
            try:
                folder["group_ids"] = await _compute_smart_folder_groups(
                    account_id, folder["smart_type"], folder.get("smart_params", {}),
                )
            except Exception as e:
                logger.warning("[%s] smart folder compute error: %s", account_id, e)

    if tree:
        return _build_folder_tree(rows)
    return rows


@router.post("", response_model=FolderResponse, status_code=201)
async def create_folder(account_id: str, body: FolderCreate):
    _init_folders_db()
    now = datetime.now(timezone.utc).isoformat()
    folder_id = str(uuid.uuid4())

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    if body.parent_id:
        cursor = conn.execute(
            "SELECT id FROM folders WHERE id = ? AND account_id = ?",
            (body.parent_id, account_id),
        )
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Parent folder not found")

    cursor = conn.execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM folders WHERE account_id = ?",
        (account_id,),
    )
    next_order = cursor.fetchone()["next_order"]

    conn.execute(
        """INSERT INTO folders (id, account_id, name, description, color, icon, group_ids,
           sort_order, parent_id, is_collapsed, is_smart, smart_type, smart_params, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, '{}', ?, ?)""",
        (folder_id, account_id, body.name, body.description, body.color, body.icon,
         json.dumps(body.group_ids), next_order, body.parent_id, now, now),
    )
    conn.commit()

    cursor = conn.execute("SELECT * FROM folders WHERE id = ?", (folder_id,))
    result = _folder_row_to_dict(cursor.fetchone())
    conn.close()
    logger.info("[%s] Folder created: %s (%s)", account_id, body.name, folder_id)
    return result


@router.post("/smart", response_model=FolderResponse, status_code=201)
async def create_smart_folder(account_id: str, body: SmartFolderConfig):
    """Create a smart folder that computes its group_ids dynamically."""
    _init_folders_db()
    now = datetime.now(timezone.utc).isoformat()
    folder_id = str(uuid.uuid4())

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    cursor = conn.execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM folders WHERE account_id = ?",
        (account_id,),
    )
    next_order = cursor.fetchone()["next_order"]

    # Compute initial group_ids
    group_ids = await _compute_smart_folder_groups(account_id, body.smart_type, body.params)

    conn.execute(
        """INSERT INTO folders (id, account_id, name, description, color, icon, group_ids,
           sort_order, parent_id, is_collapsed, is_smart, smart_type, smart_params, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 1, ?, ?, ?, ?)""",
        (folder_id, account_id, body.name, body.description, body.color, body.icon,
         json.dumps(group_ids), next_order, body.smart_type, json.dumps(body.params), now, now),
    )
    conn.commit()

    cursor = conn.execute("SELECT * FROM folders WHERE id = ?", (folder_id,))
    result = _folder_row_to_dict(cursor.fetchone())
    conn.close()
    logger.info("[%s] Smart folder created: %s (%s, type=%s)", account_id, body.name, folder_id, body.smart_type)
    return result


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(account_id: str, folder_id: str, body: FolderUpdate):
    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    cursor = conn.execute(
        "SELECT * FROM folders WHERE id = ? AND account_id = ?", (folder_id, account_id),
    )
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Folder not found")

    now = datetime.now(timezone.utc).isoformat()
    updates: list[str] = []
    params: list[Any] = []

    if body.name is not None:
        updates.append("name = ?")
        params.append(body.name)
    if body.description is not None:
        updates.append("description = ?")
        params.append(body.description)
    if body.color is not None:
        updates.append("color = ?")
        params.append(body.color)
    if body.icon is not None:
        updates.append("icon = ?")
        params.append(body.icon)
    if body.group_ids is not None:
        updates.append("group_ids = ?")
        params.append(json.dumps(body.group_ids))
    if body.order is not None:
        updates.append("sort_order = ?")
        params.append(body.order)
    if body.parent_id is not None:
        updates.append("parent_id = ?")
        params.append(body.parent_id)
    if body.is_collapsed is not None:
        updates.append("is_collapsed = ?")
        params.append(1 if body.is_collapsed else 0)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.extend([folder_id, account_id])
        conn.execute(
            f"UPDATE folders SET {', '.join(updates)} WHERE id = ? AND account_id = ?",
            params,
        )
        conn.commit()

    cursor = conn.execute("SELECT * FROM folders WHERE id = ?", (folder_id,))
    result = _folder_row_to_dict(cursor.fetchone())
    conn.close()
    return result


@router.delete("/{folder_id}", status_code=204)
async def delete_folder(account_id: str, folder_id: str):
    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT id FROM folders WHERE id = ? AND account_id = ?", (folder_id, account_id),
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Folder not found")

    # Reparent children to parent of deleted folder
    conn.execute(
        "UPDATE folders SET parent_id = (SELECT parent_id FROM folders WHERE id = ?) WHERE parent_id = ?",
        (folder_id, folder_id),
    )
    conn.execute("DELETE FROM folders WHERE id = ? AND account_id = ?", (folder_id, account_id))
    conn.commit()
    conn.close()
    logger.info("[%s] Folder deleted: %s", account_id, folder_id)


# ─── Reorder / Drag & Drop ──────────────────────────────────────────


@router.post("/reorder", status_code=200)
async def reorder_folders(account_id: str, body: list[FolderReorderInput]):
    """Bulk reorder folders via drag & drop."""
    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    now = datetime.now(timezone.utc).isoformat()
    for item in body:
        conn.execute(
            "UPDATE folders SET sort_order = ?, parent_id = ?, updated_at = ? WHERE id = ? AND account_id = ?",
            (item.order, item.parent_id, now, item.folder_id, account_id),
        )
    conn.commit()
    conn.close()
    return {"status": "ok"}


# ─── Batch Operations ──────────────────────────────────────────────


@router.post("/batch/move", status_code=200)
async def batch_move_groups(account_id: str, body: BatchMoveInput):
    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    now = datetime.now(timezone.utc).isoformat()
    moved_count = 0

    if body.source_folder_id:
        cursor = conn.execute(
            "SELECT * FROM folders WHERE id = ? AND account_id = ?",
            (body.source_folder_id, account_id),
        )
        row = cursor.fetchone()
        if row:
            current_ids = set(json.loads(row["group_ids"]))
            updated_ids = current_ids - set(body.group_ids)
            conn.execute(
                "UPDATE folders SET group_ids = ?, updated_at = ? WHERE id = ?",
                (json.dumps(list(updated_ids)), now, body.source_folder_id),
            )
            moved_count += len(current_ids - updated_ids)

    if body.target_folder_id:
        cursor = conn.execute(
            "SELECT * FROM folders WHERE id = ? AND account_id = ?",
            (body.target_folder_id, account_id),
        )
        row = cursor.fetchone()
        if row:
            current_ids = set(json.loads(row["group_ids"]))
            updated_ids = current_ids | set(body.group_ids)
            conn.execute(
                "UPDATE folders SET group_ids = ?, updated_at = ? WHERE id = ?",
                (json.dumps(list(updated_ids)), now, body.target_folder_id),
            )
            moved_count += len(updated_ids - current_ids)

    conn.commit()
    conn.close()
    logger.info("[%s] Batch moved %d groups", account_id, moved_count)
    return {"moved_count": moved_count, "source_folder_id": body.source_folder_id, "target_folder_id": body.target_folder_id}


# ─── Sync Telegram Folders ──────────────────────────────────────────


@router.post("/sync", response_model=list[FolderResponse])
async def sync_telegram_folders(account_id: str):
    manager = RuntimeManager.get_instance()
    telegram_folders = await manager.get_group_folders(account_id)
    if not telegram_folders:
        return []

    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    now = datetime.now(timezone.utc).isoformat()
    created_folders: list[dict] = []

    for tf in telegram_folders:
        title = tf.get("title", "Unnamed Folder")
        group_ids = tf.get("group_ids", [])

        cursor = conn.execute(
            "SELECT * FROM folders WHERE account_id = ? AND name = ?",
            (account_id, title),
        )
        existing = cursor.fetchone()

        if existing:
            conn.execute(
                "UPDATE folders SET group_ids = ?, updated_at = ? WHERE id = ?",
                (json.dumps(group_ids), now, existing["id"]),
            )
        else:
            folder_id = str(uuid.uuid4())
            cursor2 = conn.execute(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM folders WHERE account_id = ?",
                (account_id,),
            )
            next_order = cursor2.fetchone()["next_order"]
            conn.execute(
                """INSERT INTO folders (id, account_id, name, description, color, icon, group_ids,
                   sort_order, parent_id, is_collapsed, is_smart, smart_type, smart_params, created_at, updated_at)
                   VALUES (?, ?, ?, '', '#6366f1', 'folder', ?, ?, NULL, 0, 0, NULL, '{}', ?, ?)""",
                (folder_id, account_id, title, json.dumps(group_ids), next_order, now, now),
            )

        cursor = conn.execute(
            "SELECT * FROM folders WHERE account_id = ? AND name = ?", (account_id, title),
        )
        created_folders.append(_folder_row_to_dict(cursor.fetchone()))

    conn.commit()
    conn.close()
    logger.info("[%s] Synced %d Telegram folders", account_id, len(created_folders))
    return created_folders


# ─── Folder-based Broadcast ──────────────────────────────────────────


@router.post("/send", status_code=202)
async def send_to_folder(account_id: str, body: FolderSendInput):
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Account runtime not found")

    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    all_group_ids: list[str] = []
    exclude_set = set(body.exclude_group_ids)

    placeholders = ",".join("?" * len(body.folder_ids))
    cursor = conn.execute(
        f"SELECT group_ids, is_smart, smart_type, smart_params FROM folders WHERE id IN ({placeholders}) AND account_id = ?",
        [*body.folder_ids, account_id],
    )
    for row in cursor.fetchall():
        is_smart = bool(row["is_smart"])
        if is_smart and row["smart_type"]:
            smart_params = json.loads(row["smart_params"]) if isinstance(row["smart_params"], str) else {}
            gids = await _compute_smart_folder_groups(account_id, row["smart_type"], smart_params)
        else:
            gids = json.loads(row["group_ids"]) if isinstance(row["group_ids"], str) else (row["group_ids"] or [])
        for gid in gids:
            if gid not in exclude_set:
                all_group_ids.append(gid)

    conn.close()

    if not all_group_ids:
        raise HTTPException(status_code=400, detail="No groups found in selected folders")

    from ..models import CreateBroadcastInput

    created_ids: list[str] = []
    for group_id in all_group_ids:
        try:
            broadcast_input = CreateBroadcastInput(
                message=body.message, recipients=[group_id], account_id=account_id,
            )
            broadcast = await manager.create_broadcast(broadcast_input)
            created_ids.append(broadcast.id)
        except Exception as e:
            logger.warning("[%s] Failed to send to group %s: %s", account_id, group_id, e)

    logger.info("[%s] Folder broadcast: %d messages sent to %d groups",
                account_id, len(created_ids), len(all_group_ids))
    return {
        "broadcast_ids": created_ids,
        "total_groups": len(all_group_ids),
        "sent_count": len(created_ids),
        "message": body.message,
    }


# ─── Workspace State Persistence ─────────────────────────────────────


@router.post("/workspace-state", status_code=200)
async def save_workspace_state(account_id: str, body: dict):
    """Save workspace collapse states, pinned folders, and view preferences."""
    _init_folders_db()
    conn = sqlite3.connect(DB_PATH)
    now = datetime.now(timezone.utc).isoformat()

    collapsed = body.get("collapsed_folder_ids", [])
    pinned = body.get("pinned_folder_ids", [])

    for folder_id in collapsed:
        conn.execute(
            "UPDATE folders SET is_collapsed = 1, updated_at = ? WHERE id = ? AND account_id = ?",
            (now, folder_id, account_id),
        )
    for folder_id in pinned:
        conn.execute(
            "UPDATE folders SET sort_order = -1, updated_at = ? WHERE id = ? AND account_id = ?",
            (now, folder_id, account_id),
        )

    conn.commit()
    conn.close()
    return {"status": "ok"}
