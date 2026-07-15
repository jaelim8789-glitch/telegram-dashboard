"""
TeleMon Account Runtime Backend — FastAPI application.

Each Telegram account runs as an independent AccountRuntime (Telethon client +
EventBus + Scheduler + AutoReply + ReplyMacro + BroadcastQueue + ...).

The API serves cached data from each runtime so the frontend never waits
on Telegram API calls during account switching.
"""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .runtime_manager import RuntimeManager

# ── Logging ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("telemon.runtime")


# ── Lifespan ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and start all account runtimes on startup."""
    logger.info("=" * 60)
    logger.info("TeleMon Account Runtime starting...")
    logger.info("=" * 60)

    # Initialize DB schema
    await _init_db()

    # Initialize RuntimeManager (starts all persisted runtimes)
    manager = RuntimeManager.get_instance()
    await manager.initialize()

    logger.info("RuntimeManager ready — %d account(s) loaded", manager.runtime_count)

    yield
    # Shutdown
    logger.info("Shutting down all runtimes...")
    await manager.shutdown()
    logger.info("Goodbye.")


# ── App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="TeleMon Account Runtime",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend on any origin (dev: localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ─────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc}"},
    )


# ── Import and register routers ──────────────────────────────────────

from .routers import accounts, auth, broadcast, auto_reply, reply_macro, health, groups

app.include_router(accounts.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(broadcast.router, prefix="/api")
app.include_router(auto_reply.router, prefix="/api")
app.include_router(reply_macro.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(groups.router, prefix="/api")


# ── Root health-check ────────────────────────────────────────────────

@app.get("/")
async def root():
    manager = RuntimeManager.get_instance()
    return {
        "status": "ok",
        "runtimes_active": manager.runtime_count,
    }


# ── DB Init ──────────────────────────────────────────────────────────

async def _init_db() -> None:
    """Create SQLite tables if they don't exist."""
    import sqlite3
    db_path = os.environ.get("DB_PATH", "./data/runtime.db")
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

    def _create():
        conn = sqlite3.connect(db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                name TEXT DEFAULT '',
                status TEXT DEFAULT 'inactive',
                created_at TEXT DEFAULT ''
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS auto_reply_rules (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                name TEXT DEFAULT '',
                is_active INTEGER DEFAULT 1,
                match_type TEXT DEFAULT 'keyword',
                match_value TEXT DEFAULT '',
                reply_content TEXT DEFAULT '',
                cooldown_hours REAL DEFAULT 0,
                max_replies_per_day INTEGER DEFAULT 100,
                created_at TEXT DEFAULT '',
                updated_at TEXT DEFAULT ''
            )
        """)
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
                created_at TEXT DEFAULT '',
                updated_at TEXT DEFAULT ''
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS broadcasts (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                message TEXT DEFAULT '',
                recipients TEXT DEFAULT '[]',
                status TEXT DEFAULT 'pending',
                scheduled_at TEXT,
                sent_at TEXT,
                created_at TEXT DEFAULT '',
                error_message TEXT,
                recurring_interval_minutes INTEGER,
                cancelled_at TEXT,
                next_scheduled_at TEXT,
                is_recurring_paused INTEGER DEFAULT 0
            )
        """)
        conn.commit()
        conn.close()

    await asyncio.to_thread(_create)
    logger.info("Database initialized at %s", db_path)


# ── Entry point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
