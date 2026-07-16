# TeleMon — Telegram Management Dashboard

## Project Overview

A Telegram account/channel management dashboard for personal learning and research.
Designed for 1–3 personal accounts and channels with intentional rate-limiting
(1 broadcast per minute per account, max 10 recipients) to comply with Telegram's
spam/abuse policies.

Protected by admin JWT login + API key issuance system.

## Repository

Monorepo containing both backend (FastAPI) and infrastructure configs.
Frontend lives in a sibling directory `../telegram-dashboard/` (Next.js).

## Architecture

```
Browser ──80──▶  nginx
                 /        → frontend:3000
                 /api/*   → backend:8000
                 /docs etc → backend:8000

frontend (Next.js)    backend (FastAPI + scheduler)
                          │
                     postgres
```

No worker processes, no Redis queue. Broadcasts are sent in-process:
- **Immediate**: FastAPI `BackgroundTasks`
- **Scheduled**: APScheduler thread inside the same uvicorn process

This design decision is deliberate — free hosting (Render) doesn't provide
always-on background workers.

### Auto-Reply Exception

The auto-reply (FAQ macro) feature requires an always-on Telethon session
(`events.NewMessage` listener). It **will not work** on sleep-on-idle hosting
(Render free tier). Use a VM with Docker Compose for reliable auto-reply.

## Frontend

- **Stack**: Next.js 15 (App Router), React 18, TypeScript, TailwindCSS, Zustand
- **Location**: `../telegram-dashboard/` (sibling directory)
- **Key deps**: recharts, framer-motion, lucide-react, clsx, tailwind-merge
- **E2E tests**: Playwright (`npm run test:e2e`)
- **Build**: `next build` (static + server-side)

## Backend

- **Stack**: FastAPI, SQLAlchemy 2.x (async), Alembic, Pydantic
- **Location**: `./app/` (this repo)
- **Key deps**: Telethon, APScheduler, structlog, cryptography (Fernet), PyJWT
- **FastAPI app file**: `app/main.py`
- **Config**: `app/config.py` (env-based, DATABASE_URL auto-normalizes scheme)
- **Auth**: Admin JWT (`/api/auth/login`) + API key (`X-API-Key` header)
- **Tests**: pytest (pytest-asyncio, httpx, mock Telethon)

### Backend Structure

```
app/
├── main.py           # FastAPI app, middleware, lifespan (scheduler start/stop)
├── config.py         # Env-based settings (DB URL normalization)
├── database.py       # SQLAlchemy engine/session
├── core/             # crypto (Fernet), limits, logging, security (JWT + API key)
├── models/           # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── crud/             # DB access layer
├── api/              # Routers (admin, accounts, telegram_auth, groups, broadcast, etc.)
│   └── deps.py       # Auth dependencies (JWT or X-API-Key)
├── services/         # Telethon, broadcast_processor, auto_reply_service, etc.
└── scheduler/        # APScheduler dispatcher (scheduled broadcasts)
```

## Database

- **Engine**: PostgreSQL 16 (via asyncpg driver)
- **ORM**: SQLAlchemy 2.x async
- **Migrations**: Alembic (`./alembic/`)
- **Test DB**: `telegram_dashboard_test` (separate, created manually)
- **Key tables**: accounts, broadcasts, api_keys, auto_reply_rules/logs, users, sessions, etc.

## Docker

- **Files**: `Dockerfile` (multi-stage Python build), `docker-compose.yml`
- **Services**: db (postgres:16-alpine), backend, frontend, nginx
- **Entry point**: nginx on port 80 (reverse proxy to frontend:3000 + backend:8000)
- **Volumes**: pgdata (DB), media_data (uploaded images)

### Docker Compose Commands

```bash
docker compose up -d            # Start full stack
docker compose down             # Stop (data preserved)
docker compose down -v          # Stop + delete volumes
docker compose logs -f backend  # Tail backend logs
docker compose exec backend alembic upgrade head  # Run migrations
```

## Deployment

### Option A — Vercel + Render (free, no credit card)
- Frontend → Vercel (Next.js auto-detected)
- Backend → Render (Blueprint via `render.yaml`)
- **Caveats**: Render free tier sleeps after 15min idle; scheduled broadcasts
  only fire when server is awake. Free Postgres is time-limited.

### Option B — Single VM (Docker Compose)
- Recommended for auto-reply feature (always-on)
- Oracle Cloud free tier, any VPS
- Nginx reverse proxy, recommended: add Let's Encrypt TLS

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-normalized to asyncpg) |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram API credentials (from my.telegram.org) |
| `ENCRYPTION_KEY` | Fernet key for Telegram session encryption |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin login credentials |
| `CORS_ORIGINS` | Frontend URL for CORS (required for Vercel+Render) |

## Full Directory Structure

```
telegram-dashboard-backend/     # This repo
├── app/                        # FastAPI backend
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── core/                   # crypto, limits, logging, security
│   ├── models/                 # SQLAlchemy models
│   ├── schemas/                # Pydantic schemas
│   ├── crud/                   # DB access
│   ├── api/                    # Routers
│   │   └── deps.py             # Auth deps
│   ├── services/               # Business logic (Telethon, broadcast, auto-reply)
│   └── scheduler/              # APScheduler
├── backend/                    # Alternative backend entry (duplicated routers)
├── alembic/                    # DB migrations
├── tests/                      # pytest tests
├── nginx/                      # Reverse proxy config (local docker-compose only)
├── data/                       # Runtime data
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
├── logs/                       # JSONL structured logs
├── media/                      # Uploaded broadcast images
├── src/                        # Frontend source (Next.js pages/components/lib/store)
├── docker-compose.yml
├── Dockerfile
├── render.yaml                 # Render Blueprint
├── .env                        # Environment variables (gitignored)
└── requirements.txt            # Python dependencies

sibling: telegram-dashboard/    # Next.js frontend repo
```
