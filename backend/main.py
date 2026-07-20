"""
TeleMon Account Runtime Backend — FastAPI application (Production Mode).

Each Telegram account runs as an independent AccountRuntime (Telethon client +
EventBus + Scheduler + AutoReply + ReplyMacro + BroadcastQueue + ...).

The API serves cached data from each runtime so the frontend never waits
on Telegram API calls during account switching.

v2 — Production hardening: WAL mode, Prometheus metrics, structured logging,
      no reload, IP rate limiting, DB-backed sessions, health alerts.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .runtime_manager import RuntimeManager
from .production_config import get_config, DatabaseConfig
from .monitoring import (
    setup_structured_logging,
    MetricsMiddleware,
    metrics_endpoint,
    update_runtime_metrics,
    alert_critical,
    alert_error,
    set_metric,
    inc_metric,
)

# ── OpenTelemetry ────────────────────────────────────────────────────

try:
    from .opentelemetry_setup import setup_opentelemetry
    _otel_available = True
except ImportError:
    _otel_available = False
    import logging as _lg
    _lg.getLogger("telemon.runtime").warning("OpenTelemetry packages not installed. Tracing disabled.")


# ── Configuration ────────────────────────────────────────────────────

cfg = get_config()
logger = logging.getLogger("telemon.runtime")


# ── Lifespan ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database, enable WAL mode, start all account runtimes."""
    logger.info("=" * 60)
    logger.info("TeleMon Account Runtime starting — PRODUCTION MODE")
    logger.info("Environment: %s", cfg.environment)
    logger.info("=" * 60)

    # Setup structured logging
    setup_structured_logging(cfg.app_name)

    # Initialize DB schema (with WAL mode)
    await _init_db()

    # Start DB backup scheduler
    backup_task = None
    if cfg.db.backup_enabled:
        backup_task = asyncio.create_task(_db_backup_loop())
        logger.info("DB backup scheduler started (every %d min)", cfg.db.backup_interval_minutes)

    # Initialize RuntimeManager (starts all persisted runtimes)
    manager = RuntimeManager.get_instance()
    await manager.initialize()

    # Update metrics
    update_runtime_metrics(manager.runtime_count, manager.runtime_count)

    logger.info("RuntimeManager ready — %d account(s) loaded", manager.runtime_count)

    yield
    # Shutdown
    logger.info("Shutting down all runtimes...")

    # Cancel backup task
    if backup_task:
        backup_task.cancel()
        try:
            await backup_task
        except asyncio.CancelledError:
            pass

    await manager.shutdown()
    logger.info("Goodbye.")


# ── App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="TeleMon Account Runtime",
    version=cfg.app_version,
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend on any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.server.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Metrics middleware (must be early in middleware chain)
if cfg.monitoring.metrics_enabled:
    app.add_middleware(MetricsMiddleware)

# OpenTelemetry instrumentation (before routes are registered)
if _otel_available:
    try:
        setup_opentelemetry(app)
    except Exception as e:
        logger.warning("OpenTelemetry setup failed (non-fatal): %s", e)


# ── Global error handler ─────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    alert_error(
        "Unhandled HTTP Exception",
        f"{request.method} {request.url.path}: {exc}",
        {"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ── Metrics endpoint ─────────────────────────────────────────────────

if cfg.monitoring.metrics_enabled:
    @app.get("/metrics")
    async def metrics(request: Request):
        """Prometheus metrics endpoint."""
        return await metrics_endpoint(request)


# ── Import and register routers ──────────────────────────────────────

from .routers import accounts, auth, broadcast, auto_reply, reply_macro, health, groups, runtime_inspector, folders, healing, admin, free_api_key, guest_routes, stars_payments, draft_routes, trigger_routes

app.include_router(accounts.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(broadcast.router, prefix="/api")
app.include_router(auto_reply.router, prefix="/api")
app.include_router(reply_macro.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(runtime_inspector.router, prefix="/api")
app.include_router(folders.router)
app.include_router(healing.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(free_api_key.router, prefix="/api")
app.include_router(guest_routes.router)
app.include_router(stars_payments.router)
app.include_router(draft_routes.router)
app.include_router(trigger_routes.router)


# ── Root health-check ────────────────────────────────────────────────

@app.get("/")
async def root():
    manager = RuntimeManager.get_instance()
    return {
        "status": "ok",
        "version": cfg.app_version,
        "environment": cfg.environment,
        "runtimes_active": manager.runtime_count,
        "uptime_seconds": int(time.time() - _startup_time),
    }


# ── Startup time tracking ───────────────────────────────────────────

_startup_time = time.time()


# ── DB Init (with WAL mode) ──────────────────────────────────────────

async def _init_db() -> None:
    """Create SQLite tables if they don't exist. Enable WAL mode."""
    import sqlite3
    db_path = cfg.db.db_path
    admin_db_path = cfg.db.admin_db_path
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
    os.makedirs(os.path.dirname(admin_db_path) or ".", exist_ok=True)

    def _create():
        conn = sqlite3.connect(db_path)

        # Enable WAL mode for concurrent read performance
        if cfg.db.wal_mode:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute("PRAGMA cache_size=-4000")  # 4MB cache

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
                is_recurring_paused INTEGER DEFAULT 0,
                delivery_mode TEXT DEFAULT 'normal',
                reply_to_message_id INTEGER,
                failure_info TEXT,
                inline_buttons TEXT
            )
        """)
        conn.commit()
        conn.close()

        # Initialize admin DB with WAL mode
        admin_conn = sqlite3.connect(admin_db_path)
        if cfg.db.wal_mode:
            admin_conn.execute("PRAGMA journal_mode=WAL")
            admin_conn.execute("PRAGMA synchronous=NORMAL")
            admin_conn.execute("PRAGMA busy_timeout=5000")
        admin_conn.close()

    await asyncio.to_thread(_create)
    logger.info("Database initialized (WAL mode: %s)", cfg.db.wal_mode)


# ── DB Backup Loop ───────────────────────────────────────────────────

async def _db_backup_loop() -> None:
    """Periodically backup SQLite databases."""
    import shutil
    import sqlite3

    db_config = cfg.db
    os.makedirs(db_config.backup_dir, exist_ok=True)

    while True:
        try:
            await asyncio.sleep(db_config.backup_interval_minutes * 60)

            timestamp = time.strftime("%Y%m%d_%H%M%S")
            db_paths = [db_config.db_path, db_config.admin_db_path]

            for db_path in db_paths:
                if not os.path.exists(db_path):
                    continue

                db_name = os.path.basename(db_path)
                backup_name = f"{db_name}.{timestamp}.backup"
                backup_path = os.path.join(db_config.backup_dir, backup_name)

                # Use SQLite backup API for consistency (non-blocking via thread)
                try:

                    def _do_backup(src: str, dst: str) -> None:
                        src_conn = sqlite3.connect(src, timeout=30)
                        try:
                            dest_conn = sqlite3.connect(dst, timeout=30)
                            try:
                                src_conn.backup(dest_conn, pages=100, progress=None)
                            finally:
                                dest_conn.close()
                        finally:
                            src_conn.close()

                    await asyncio.to_thread(_do_backup, db_path, backup_path)

                    # Keep only last 48 backups per database
                    _prune_backups(db_config.backup_dir, db_name, max_keep=48)

                    logger.info("DB backup created: %s", backup_path)
                except Exception as e:
                    logger.error("DB backup failed for %s: %s", db_path, e)

            inc_metric("db_backups_total")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("DB backup loop error: %s", e)


def _prune_backups(backup_dir: str, db_name: str, max_keep: int = 48) -> None:
    """Remove old backups, keeping only the most recent N."""
    import glob

    pattern = os.path.join(backup_dir, f"{db_name}.*.backup")
    backups = sorted(glob.glob(pattern))

    while len(backups) > max_keep:
        old = backups.pop(0)
        try:
            os.remove(old)
        except OSError:
            pass


# ── Entry point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=cfg.server.host,
        port=cfg.server.port,
        reload=cfg.server.reload,  # False in production
        log_level=cfg.server.log_level,
        workers=cfg.server.workers,
        timeout_keep_alive=cfg.server.request_timeout,
        limit_concurrency=100,  # Max concurrent connections
        limit_max_requests=10000,  # Graceful restart after 10k requests
    )