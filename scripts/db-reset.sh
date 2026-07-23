#!/usr/bin/env bash
set -e
echo "=== TeleMon Local DB Reset ==="
echo "Dropping and recreating database..."
if command -v psql &>/dev/null; then
  psql -U postgres -c "DROP DATABASE IF EXISTS telegram_messenger;" 2>/dev/null || true
  psql -U postgres -c "CREATE DATABASE telegram_messenger;" 2>/dev/null || true
  echo "Running seed data..."
  cd telegram-dashboard-backend
  python scripts/seed_local.py
  echo "DB reset and seeded."
else
  echo "psql not found. Install PostgreSQL or run seed manually:"
  echo "  cd telegram-dashboard-backend && python scripts/seed_local.py"
fi
