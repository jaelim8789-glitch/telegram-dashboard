#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "=== TeleMon Dev ==="

echo "[1/2] Starting backend (uvicorn --reload)..."
cd "$ROOT/backend"
ENVIRONMENT=development RELOAD=true LOG_LEVEL=debug \
  python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug &
BACK_PID=$!

echo "[2/2] Starting frontend (next dev --turbo)..."
cd "$ROOT"
pnpm dev &
FRONT_PID=$!

echo ""
echo "Dev servers starting..."
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACK_PID $FRONT_PID 2>/dev/null; exit" INT TERM
wait
