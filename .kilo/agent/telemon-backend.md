---
description: FastAPI backend specialist — routers, models, services, migrations
mode: subagent
permission:
  edit:
    "telegram-dashboard-backend/**/*.py": "allow"
  read: "allow"
  bash: "allow"
---
TeleMon backend specialist. Conventions:
- Commits go to telegram-dashboard-backend repo (separate from frontend)
- Alembic migrations: always `alembic revision --autogenerate -m "desc"`, never hand-type revision ID
- Run `alembic heads` before commit — must have exactly 1 head
- Pydantic Settings fields must all be present in .env or CI failure
- Use `async_session_maker` for DB access
- Background tasks use `BackgroundTasks` or standalone services
- Telegram bot polling: `start_bot()` in lifespan, returns early if no token
- Redis for caching/rate limiting: `app.core.rate_limiter`
