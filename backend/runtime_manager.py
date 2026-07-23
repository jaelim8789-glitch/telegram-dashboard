"""
RuntimeManager — 각 Telegram 계정이 독립된 Runtime으로 동작합니다.

Runtime 구성 요소:
- Telethon Client
- EventBus
- Scheduler
- AutoReply
- Reply Macro
- Broadcast Queue
- Group/Dialog Cache
- Health Monitor
- Auto Recovery
- Rate Limiter

계정 전환 시 API 재호출 없이 즉시 전환됩니다.
백그라운드에서는 로그인된 모든 계정이 동시에 동작합니다.
"""

from __future__ import annotations

import asyncio
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from .account_runtime import AccountRuntime
from .healing_engine import HealingEngine
from .models import (
    Account,
    AccountHealthItem,
    AutoReplyLog,
    AutoReplyRule,
    AutoReplySettings,
    Broadcast,
    CreateBroadcastInput,
    Group,
    ReplyMacro,
    ReplyMacroLog,
)

logger = logging.getLogger(__name__)

DB_PATH = "data/runtime.db"
SESSIONS_DIR = "sessions"


class RuntimeManager:
    """Singleton — 모든 AccountRuntime 인스턴스를 관리합니다.

    계정 추가/삭제 시 Runtime을 생성/제거하고,
    모든 Runtime이 백그라운드에서 독립적으로 동작하도록 합니다.
    """

    _instance: RuntimeManager | None = None

    @classmethod
    def get_instance(cls) -> RuntimeManager:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self) -> None:
        self._runtimes: dict[str, AccountRuntime] = {}
        self._lock = asyncio.Lock()
        self._initialized = False
        self.healing_engine = HealingEngine(self)

    async def initialize(self) -> None:
        """DB에서 계정 목록을 불러와 모든 Runtime을 시작합니다."""
        if self._initialized:
            return
        self._initialized = True

        # DB 초기화
        self._init_db()

        # Healing Engine 시작
        await self.healing_engine.start()

        # 저장된 계정 목록 로드
        accounts = await asyncio.to_thread(self._load_accounts)
        if not accounts:
            logger.info("저장된 계정이 없습니다. API를 통해 계정을 추가하세요.")
            return

        # 각 계정의 Runtime 생성 및 시작 (Staggered Startup — 500ms 간격)
        delay = self.healing_engine.startup_delay
        for idx, acct in enumerate(accounts):
            try:
                runtime = AccountRuntime(
                    account_id=acct["id"],
                    phone=acct["phone"],
                    api_id=acct.get("api_id", 0) or 0,
                    api_hash=acct.get("api_hash", "") or "",
                    session_path=f"{SESSIONS_DIR}/{acct['id']}.session",
                )
                async with self._lock:
                    self._runtimes[acct["id"]] = runtime

                # Healing Engine에 등록
                self.healing_engine.register_account(acct["id"])

                await runtime.start()

                # Load reply macros from DB into runtime
                await self._load_macros_for_account(acct["id"], runtime)

                logger.info("[%s] Runtime 시작됨 (%d/%d)", acct["id"], idx + 1, len(accounts))

                # Staggered delay between account starts
                if delay > 0 and idx < len(accounts) - 1:
                    await asyncio.sleep(delay)
            except Exception as e:
                logger.error("[%s] Runtime 시작 실패: %s", acct["id"], e)

        logger.info("RuntimeManager 초기화 완료 — %d개 계정", len(self._runtimes))

    async def shutdown(self) -> None:
        """모든 Runtime을 안전하게 종료합니다."""
        # Healing Engine 먼저 중지
        await self.healing_engine.stop()

        async with self._lock:
            for runtime in self._runtimes.values():
                await runtime.stop()
            self._runtimes.clear()
        logger.info("RuntimeManager 종료됨")

    async def add_account(self, phone: str, api_id: int, api_hash: str, name: str | None = None) -> Account:
        """새 계정을 추가하고 Runtime을 시작합니다."""
        account_id = str(uuid.uuid4())
        acct = {
            "id": account_id,
            "phone": phone,
            "name": name or "",
            "api_id": api_id,
            "api_hash": api_hash,
            "status": "inactive",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # DB 저장
        await asyncio.to_thread(self._save_account, acct)

        # Runtime 생성 및 시작
        runtime = AccountRuntime(
            account_id=account_id,
            phone=phone,
            api_id=api_id,
            api_hash=api_hash,
            session_path=f"{SESSIONS_DIR}/{account_id}.session",
        )
        async with self._lock:
            self._runtimes[account_id] = runtime

        # Healing Engine에 등록
        self.healing_engine.register_account(account_id)

        try:
            await runtime.start()
            await self._load_macros_for_account(account_id, runtime)
        except Exception as e:
            logger.warning("[%s] Runtime start failed (non-fatal): %s", account_id, e)
            # Runtime is still registered; user can re-auth later

        return runtime.get_account()

    async def add_account_legacy(self, phone: str, name: str | None = None) -> Account:
        """계정 추가 (인증 없이 계정만 DB에 저장, Runtime 생성).
        
        Telethon client는 생성하지만 start()를 호출하지 않음.
        사용자가 이후 send-code → verify-code 플로우로 인증.
        api_id=1, api_hash="placeholder"를 사용하여 Telethon 생성자 통과.
        """
        account_id = str(uuid.uuid4())
        acct = {
            "id": account_id,
            "phone": phone,
            "name": name or "",
            "api_id": 0,
            "api_hash": "",
            "status": "inactive",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # DB에 저장
        await asyncio.to_thread(self._save_account, acct)

        # Runtime 생성 (Telethon client는 생성하지만 start()는 호출하지 않음)
        # api_id=1, api_hash="placeholder"는 Telethon 생성자 통과용 더미값
        runtime = AccountRuntime(
            account_id=account_id,
            phone=phone,
            api_id=1,
            api_hash="placeholder",
            session_path=f"{SESSIONS_DIR}/{account_id}.session",
        )
        async with self._lock:
            self._runtimes[account_id] = runtime

        # Healing Engine에 등록
        self.healing_engine.register_account(account_id)

        # Runtime에 Telethon client는 연결하지 않고 백그라운드 태스크만 시작
        runtime._running = True
        runtime._status = "inactive"
        runtime.health_monitor.set_session_status(False)
        runtime.scheduler.start()
        runtime.broadcast_queue.start()

        # Load any existing reply macros from DB
        asyncio.create_task(self._load_macros_for_account(account_id, runtime))

        logger.info("[%s] Legacy account created (no auth) -- waiting for verification", account_id)
        return runtime.get_account()

    async def remove_account(self, account_id: str) -> None:
        """계정을 제거하고 Runtime을 종료합니다."""
        # Healing Engine에서 제거
        self.healing_engine.unregister_account(account_id)

        async with self._lock:
            runtime = self._runtimes.pop(account_id, None)
            if runtime:
                await runtime.stop()
        await asyncio.to_thread(self._delete_account, account_id)
        logger.info("[%s] 계정 제거됨", account_id)

    async def get_accounts(self) -> list[Account]:
        """모든 계정 목록을 Runtime의 실시간 데이터로 반환합니다."""
        async with self._lock:
            return [r.get_account() for r in self._runtimes.values()]

    async def get_account(self, account_id: str) -> Account | None:
        runtime = self._runtimes.get(account_id)
        return runtime.get_account() if runtime else None

    async def get_health(self) -> list[AccountHealthItem]:
        async with self._lock:
            return [r.get_health() for r in self._runtimes.values()]

    def get_runtime(self, account_id: str) -> AccountRuntime | None:
        return self._runtimes.get(account_id)

    def get_all_runtimes(self) -> list[AccountRuntime]:
        """Returns a list of all active runtime instances."""
        return list(self._runtimes.values())

    @property
    def runtime_count(self) -> int:
        return len(self._runtimes)

    # ── Runtime access helpers ────────────────────────────────────

    def _get_runtime_or_raise(self, account_id: str) -> AccountRuntime:
        runtime = self._runtimes.get(account_id)
        if not runtime:
            raise LookupError(f"Account {account_id} not found")
        return runtime

    async def _load_macros_for_account(self, account_id: str, runtime: AccountRuntime) -> None:
        """Load reply macros from DB into the runtime's ReplyMacroEngine on startup."""
        try:
            import json
            conn = sqlite3.connect("data/runtime.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM reply_macros WHERE account_id = ? ORDER BY created_at DESC",
                (account_id,),
            )
            rows = []
            for row in cursor.fetchall():
                rows.append(ReplyMacro(
                    id=row["id"],
                    account_id=row["account_id"],
                    name=row["name"],
                    is_active=bool(row["is_active"]),
                    target_chats=json.loads(row["target_chats"]) if isinstance(row["target_chats"], str) else (row["target_chats"] or []),
                    message_content=row["message_content"],
                    media_path=row["media_path"],
                    schedule_type=row["schedule_type"],
                    interval_hours=row["interval_hours"],
                    fixed_time=row["fixed_time"],
                    max_sends_per_day=row["max_sends_per_day"],
                    reply_to_message_id=row["reply_to_message_id"],
                    last_sent_at=row["last_sent_at"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                ))
            conn.close()
            if rows:
                runtime.reply_macro.set_macros(rows)
                logger.info("[%s] Loaded %d reply macro(s) from DB", account_id, len(rows))
        except Exception as e:
            logger.debug("[%s] No reply macros to load from DB: %s", account_id, e)

    # ── Auth operations (delegated to AccountRuntime) ──────────────

    async def send_code(self, account_id: str) -> dict:
        runtime = self._get_runtime_or_raise(account_id)
        return await runtime.send_code()

    async def verify_code(self, account_id: str, code: str) -> dict:
        runtime = self._get_runtime_or_raise(account_id)
        return await runtime.verify_code(code)

    async def verify_2fa(self, account_id: str, password: str) -> dict:
        runtime = self._get_runtime_or_raise(account_id)
        return await runtime.verify_2fa(password)

    async def get_auth_status(self, account_id: str) -> dict:
        runtime = self._runtimes.get(account_id)
        if not runtime:
            return {"status": "inactive", "requires_2fa": False, "detail": "Account not found"}
        return await runtime.get_auth_status()

    async def re_auth(self, account_id: str) -> dict:
        runtime = self._get_runtime_or_raise(account_id)
        return await runtime.re_auth()

    def get_account_ids_by_user(self, user_id: str) -> list[str] | None:
        return None

    def get_account_owner(self, account_id: str) -> dict | None:
        return None

    # ── Group operations ───────────────────────────────────────────

    async def get_groups(self, account_id: str) -> list[Group]:
        runtime = self._runtimes.get(account_id)
        if not runtime:
            return []
        return runtime.group_cache.get_all()

    async def get_group_folders(self, account_id: str) -> list[dict]:
        """Return Telegram chat folders for the given account."""
        runtime = self._runtimes.get(account_id)
        if not runtime:
            return []
        try:
            from telethon.tl.functions.messages import GetDialogFiltersRequest
            from telethon.tl.types import DialogFilter
            result = await runtime.client(GetDialogFiltersRequest())
            folders = []
            for f in result:
                if isinstance(f, DialogFilter):
                    folder = {
                        "id": str(f.id),
                        "title": f.title or "",
                        "group_ids": [str(p.id) for p in (f.include_peers or [])],
                    }
                    folders.append(folder)
            return folders
        except Exception:
            return []

    # ── Account health ─────────────────────────────────────────────

    async def get_account_health(self, account_id: str) -> AccountHealthItem | None:
        runtime = self._runtimes.get(account_id)
        if not runtime:
            return None
        return runtime.get_health()

    # ── Broadcast operations ───────────────────────────────────────

    async def create_broadcast(self, input_data: CreateBroadcastInput, plan: str = "free") -> Broadcast:
        runtime = self._get_runtime_or_raise(input_data.account_id)
        return await runtime.create_broadcast(input_data, plan=plan)

    async def get_broadcasts(self, account_id: str | None = None, limit: int = 50) -> list[Broadcast]:
        """Get broadcasts, optionally filtered by account_id."""
        async with self._lock:
            result = []
            for runtime in self._runtimes.values():
                if account_id and runtime.account_id != account_id:
                    continue
                result.extend(runtime.get_broadcasts(limit))
            result.sort(key=lambda b: b.created_at, reverse=True)
            return result[:limit]

    # ── Auto-reply operations ──────────────────────────────────────

    async def get_auto_reply_settings(self, account_id: str) -> AutoReplySettings:
        runtime = self._get_runtime_or_raise(account_id)
        return AutoReplySettings(
            account_id=account_id,
            auto_reply_enabled=runtime.auto_reply.is_enabled(),
            rules=list(runtime.auto_reply._rules),  # Defensive copy — prevents mutation leak
        )

    async def create_auto_reply_rule(self, account_id: str, body: dict) -> AutoReplyRule:
        runtime = self._get_runtime_or_raise(account_id)
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        rule = AutoReplyRule(
            id=str(uuid.uuid4()),
            account_id=account_id,
            name=body.get("name", ""),
            is_active=body.get("is_active", True),
            match_type=body.get("match_type", "keyword"),
            match_value=body.get("match_value", ""),
            reply_content=body.get("reply_content", ""),
            cooldown_hours=body.get("cooldown_hours", 0),
            max_replies_per_day=body.get("max_replies_per_day", 100),
            created_at=now,
            updated_at=now,
        )
        runtime.auto_reply._rules.append(rule)
        return rule

    async def update_auto_reply_rule(self, account_id: str, rule_id: str, body: dict) -> AutoReplyRule:
        runtime = self._get_runtime_or_raise(account_id)
        now = datetime.now(timezone.utc).isoformat()
        for rule in runtime.auto_reply._rules:
            if rule.id == rule_id:
                if "name" in body:
                    rule.name = body["name"]
                if "is_active" in body:
                    rule.is_active = body["is_active"]
                if "match_type" in body:
                    rule.match_type = body["match_type"]
                if "match_value" in body:
                    rule.match_value = body["match_value"]
                if "reply_content" in body:
                    rule.reply_content = body["reply_content"]
                if "cooldown_hours" in body:
                    rule.cooldown_hours = body["cooldown_hours"]
                if "max_replies_per_day" in body:
                    rule.max_replies_per_day = body["max_replies_per_day"]
                rule.updated_at = now
                return rule
        raise LookupError(f"Auto-reply rule {rule_id} not found")

    async def delete_auto_reply_rule(self, account_id: str, rule_id: str) -> None:
        runtime = self._get_runtime_or_raise(account_id)
        runtime.auto_reply._rules = [r for r in runtime.auto_reply._rules if r.id != rule_id]

    async def toggle_auto_reply(self, account_id: str, enabled: bool) -> bool:
        runtime = self._get_runtime_or_raise(account_id)
        runtime.auto_reply.set_enabled(enabled)
        return enabled

    async def get_auto_reply_logs(self, account_id: str) -> list[AutoReplyLog]:
        runtime = self._runtimes.get(account_id)
        if not runtime:
            return []
        return runtime.auto_reply.get_logs()

    # ── Reply Macro operations ─────────────────────────────────────

    async def get_reply_macros(self, account_id: str) -> list[ReplyMacro]:
        runtime = self._runtimes.get(account_id)
        if not runtime:
            return []
        return runtime.reply_macro.get_macros()

    async def create_reply_macro(self, account_id: str, body: dict) -> ReplyMacro:
        runtime = self._get_runtime_or_raise(account_id)
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        macro = ReplyMacro(
            id=str(uuid.uuid4()),
            account_id=account_id,
            name=body.get("name", ""),
            is_active=body.get("is_active", True),
            target_chats=body.get("target_chats", []),
            message_content=body.get("message_content", ""),
            media_path=body.get("media_path"),
            schedule_type=body.get("schedule_type", "interval"),
            interval_hours=body.get("interval_hours", 24),
            fixed_time=body.get("fixed_time"),
            max_sends_per_day=body.get("max_sends_per_day", 10),
            created_at=now,
            updated_at=now,
        )
        runtime.reply_macro.set_macros(runtime.reply_macro.get_macros() + [macro])
        return macro

    async def update_reply_macro(self, account_id: str, macro_id: str, body: dict) -> ReplyMacro:
        runtime = self._get_runtime_or_raise(account_id)
        now = datetime.now(timezone.utc).isoformat()
        macros = runtime.reply_macro.get_macros()
        for macro in macros:
            if macro.id == macro_id:
                if "name" in body:
                    macro.name = body["name"]
                if "is_active" in body:
                    macro.is_active = body["is_active"]
                if "target_chats" in body:
                    macro.target_chats = body["target_chats"]
                if "message_content" in body:
                    macro.message_content = body["message_content"]
                if "schedule_type" in body:
                    macro.schedule_type = body["schedule_type"]
                if "interval_hours" in body:
                    macro.interval_hours = body["interval_hours"]
                if "fixed_time" in body:
                    macro.fixed_time = body["fixed_time"]
                if "max_sends_per_day" in body:
                    macro.max_sends_per_day = body["max_sends_per_day"]
                macro.updated_at = now
                runtime.reply_macro.set_macros(macros)
                return macro
        raise LookupError(f"Reply macro {macro_id} not found")

    async def delete_reply_macro(self, account_id: str, macro_id: str) -> None:
        runtime = self._get_runtime_or_raise(account_id)
        macros = runtime.reply_macro.get_macros()
        runtime.reply_macro.set_macros([m for m in macros if m.id != macro_id])

    async def execute_reply_macro(self, account_id: str, macro_id: str) -> None:
        runtime = self._get_runtime_or_raise(account_id)
        macros = runtime.reply_macro.get_macros()
        for macro in macros:
            if macro.id == macro_id:
                await runtime.reply_macro._execute_macro(macro)
                return
        raise LookupError(f"Reply macro {macro_id} not found")

    async def get_reply_macro_logs(self, account_id: str, macro_id: str) -> list[ReplyMacroLog]:
        runtime = self._runtimes.get(account_id)
        if not runtime:
            return []
        return runtime.reply_macro.get_logs(macro_id)

    # ── DB helpers ───────────────────────────────────────────────

    def _init_db(self) -> None:
        import os
        os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                name TEXT DEFAULT '',
                api_id INTEGER DEFAULT 0,
                api_hash TEXT DEFAULT '',
                status TEXT DEFAULT 'inactive',
                created_at TEXT DEFAULT ''
            )
        """)
        conn.commit()
        conn.close()

    def _load_accounts(self) -> list[dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT id, phone, name, api_id, api_hash, status, created_at FROM accounts ORDER BY created_at"
        )
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    def _save_account(self, acct: dict[str, Any]) -> None:
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            """INSERT OR REPLACE INTO accounts
               (id, phone, name, api_id, api_hash, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (acct["id"], acct["phone"], acct.get("name", ""),
             acct.get("api_id", 0), acct.get("api_hash", ""),
             acct.get("status", "inactive"), acct.get("created_at", "")),
        )
        conn.commit()
        conn.close()

    def _delete_account(self, account_id: str) -> None:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
        conn.commit()
        conn.close()
