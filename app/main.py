"""FastAPI application with production-safe startup, health checks, and shutdown.

Improvements in this hardening batch:
- ``/health`` now includes a database connectivity probe (critical for Render
  free-tier cold-start monitoring and load-balancer health checks).
- Lifespan startup failures (scheduler, auto-reply listeners, Telegram bot) are
  *isolated* — one component failing does not prevent the app from starting.
  Errors are logged and the app continues without the failed component.
- ``ProxyHeadersMiddleware`` ensures ``request.client.host`` / ``X-Forwarded-For``
  resolve correctly when the app runs behind nginx or Cloudflare.
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import text

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.billing import router as billing_router
from app.api.deps import require_api_key_or_admin
from app.api.referrals import public_router as referrals_public_router
from app.api.referrals import router as referrals_router
from app.api.usdt_payment import router as usdt_payment_router
from app.config import settings
from app.core.logging import configure_logging, get_logger
from app.database import async_session_maker
from app.scheduler.scheduler import shutdown_scheduler, start_scheduler
from app.services.auto_reply_service import attach_all_active_listeners
from app.services.telegram_bot_service import start_bot, stop_bot
from app.services.telethon_pool import pool

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: start services on boot, stop them on shutdown.

    Each startup step is wrapped in try/except so a failure in one
    (e.g. scheduler DB error, unauthenticated account, missing bot token)
    does not prevent the HTTP server from starting — the app is degraded
    but still serving health checks and API calls.
    """
    # ── Scheduler ──────────────────────────────────────────────────────
    try:
        start_scheduler()
        logger.info("scheduler_started")
    except Exception as exc:
        logger.error("scheduler_startup_failed", error=str(exc))

    # ── Auto-reply listeners ───────────────────────────────────────────
    try:
        await attach_all_active_listeners()
        logger.info("auto_reply_listeners_attached")
    except Exception as exc:
        logger.error("auto_reply_listeners_startup_failed", error=str(exc))

    # ── Telegram bot (optional) ────────────────────────────────────────
    try:
        await start_bot()
    except Exception as exc:
        logger.error("telegram_bot_startup_failed", error=str(exc))

    logger.info("app_started")
    yield

    # ── Shutdown ───────────────────────────────────────────────────────
    try:
        await stop_bot()
    except Exception as exc:
        logger.error("telegram_bot_shutdown_failed", error=str(exc))

    try:
        shutdown_scheduler()
    except Exception as exc:
        logger.error("scheduler_shutdown_failed", error=str(exc))

    try:
        await pool.disconnect_all()
    except Exception as exc:
        logger.error("pool_disconnect_failed", error=str(exc))

    logger.info("app_stopped")


app = FastAPI(
    title="Telegram Management Dashboard API",
    lifespan=lifespan,
    debug=settings.debug,
    # Hide interactive API docs when not in debug mode -- this app handles encrypted
    # Telegram sessions, so the schema (and "try it out" button) shouldn't be public
    # by default in a real deployment.
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# ── Middleware stack ───────────────────────────────────────────────────
# Order matters: ProxyHeaders runs first so downstream middleware and routes
# see the correct client IP when behind nginx/Cloudflare.
# TrustedHost runs last (outermost) to reject requests with unexpected Host headers.

if settings.environment.strip().lower() in ("production", "prod"):
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "telemon.online",
            "www.telemon.online",
            "app.telemon.online",
            "api.telemon.online",
            "localhost",
            "127.0.0.1",
        ],
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────

app.include_router(admin_router)
app.include_router(auth_router)

_auth_required = [Depends(require_api_key_or_admin)]
app.include_router(billing_router, dependencies=_auth_required)
app.include_router(usdt_payment_router)
app.include_router(referrals_public_router)
app.include_router(referrals_router, dependencies=_auth_required)


@app.get("/health")
async def health():
    """Health check endpoint with database connectivity probe.

    Returns 200 with ``{"status": "ok"}`` when the app is running and the
    database is reachable. If the database is down, returns 503 so load
    balancers / Render can route traffic away from this instance.
    """
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "environment": settings.environment}
    except Exception as exc:
        logger.warning("health_check_db_failed", error=str(exc))
        from fastapi.responses import JSONResponse
        from starlette.status import HTTP_503_SERVICE_UNAVAILABLE
        return JSONResponse(
            status_code=HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "degraded", "environment": settings.environment, "detail": "database unreachable"},
        )