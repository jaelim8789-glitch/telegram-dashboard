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
from .models import (
    Account,
    AccountHealthItem,
    Broadcast,
    CreateBroadcastInput,
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

    async def initialize(self) -> None:
        """DB에서 계정 목록을 불러와 모든 Runtime을 시작합니다."""
        if self._initialized:
            return
        self._initialized = True

        # DB 초기화
        self._init_db()

        # 저장된 계정 목록 로드
        accounts = await asyncio.to_thread(self._load_accounts)
        if not accounts:
            logger.info("저장된 계정이 없습니다. API를 통해 계정을 추가하세요.")
            return

        # 각 계정의 Runtime 생성 및 시작
        for acct in accounts:
            try:
                runtime = AccountRuntime(
                    account_id=acct["id"],
                    phone=acct["phone"],
                    api_id=acct.get("api_id", TELEGRAM_API_ID) or TELEGRAM_API_ID,
                    api_hash=acct.get("api_hash", TELEGRAM_API_HASH) or TELEGRAM_API_HASH,
                    session_path=f"{SESSIONS_DIR}/{acct['id']}.session",
                )
                async with self._lock:
                    self._runtimes[acct["id"]] = runtime
                await runtime.start()
                logger.info("[%s] Runtime 시작됨", acct["id"])
            except Exception as e:
                logger.error("[%s] Runtime 시작 실패: %s", acct["id"], e)

        logger.info("RuntimeManager 초기화 완료 — %d개 계정", len(self._runtimes))

    async def shutdown(self) -> None:
        """모든 Runtime을 안전하게 종료합니다."""
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

        await runtime.start()
        return runtime.get_account()

    async def add_account_legacy(self, phone: str, name: str | None = None) -> Account:
        """For environments where TELEGRAM_API_ID/HASH are preconfigured at module level."""
        return await self.add_account(phone, 0, "", name)

    async def remove_account(self, account_id: str) -> None:
        """계정을 제거하고 Runtime을 종료합니다."""
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

    @property
    def runtime_count(self) -> int:
        return len(self._runtimes)

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
