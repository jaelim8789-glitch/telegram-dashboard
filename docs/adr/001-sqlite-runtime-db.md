# ADR 001: SQLite as Runtime Database

**Date:** 2026-07-23
**Status:** Accepted

## Context
Each Telegram account runs as an independent runtime (Telethon client + event bus + scheduler). The system needs to persist accounts, auto-reply rules, reply macros, and broadcasts across restarts.

## Decision
Use SQLite with WAL mode for the runtime database.

## Consequences
- **Positive:** Zero infrastructure dependencies; single file backup; WAL mode allows concurrent reads
- **Negative:** Single-writer bottleneck; no native replication; schema migrations require code changes
- **Mitigation:** `PRAGMA busy_timeout=10000` prevents lock errors; backup loop pushes to disk every N minutes

## Alternatives Considered
- **PostgreSQL:** Used for admin panel but adds connection overhead for per-account runtime queries
- **Redis:** Would require snapshot persistence; overkill for ACID requirements
