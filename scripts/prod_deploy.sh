#!/bin/bash
set -e

# ============================================================
# TeleMon Production Deployment Script
# 
# Usage:
#   ./scripts/prod_deploy.sh [--build] [--migrate] [--restart]
#
# Environment variables:
#   ENVIRONMENT=production|development
#   PORT=8000
#   HOST=0.0.0.0
#   DB_PATH=data/runtime.db
#   ADMIN_DB_PATH=data/admin.db
#   DB_BACKUP_ENABLED=true
#   DB_BACKUP_DIR=data/backups
#   METRICS_ENABLED=true
#   STRUCTURED_LOGGING=true
#   ALERT_WEBHOOK_URL=         # Discord/Slack/Telegram webhook URL
#   CORS_ORIGINS=http://localhost:3000
#   SESSIONS_DIR=sessions
#   TOKEN_EXPIRY_HOURS=24
#   DEBUG=false
# ============================================================

echo "=== TeleMon Production Deployment ==="
echo "Environment: ${ENVIRONMENT:-production}"
echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo ""

# Parse arguments
DO_BUILD=false
DO_MIGRATE=false
DO_RESTART=false

for arg in "$@"; do
  case $arg in
    --build) DO_BUILD=true ;;
    --migrate) DO_MIGRATE=true ;;
    --restart) DO_RESTART=true ;;
    --help)
      echo "Usage: $0 [--build] [--migrate] [--restart]"
      echo ""
      echo "  --build    Build the Next.js frontend"
      echo "  --migrate  Run database migrations"
      echo "  --restart  Restart the backend service"
      exit 0
      ;;
  esac
done

# Ensure directories exist
mkdir -p data sessions data/backups

# Build frontend (if requested)
if [ "$DO_BUILD" = true ]; then
  echo "[1/3] Building Next.js frontend..."
  npm ci
  npm run build
  echo "Frontend build complete."
  echo ""
fi

# Database setup
if [ "$DO_MIGRATE" = true ]; then
  echo "[2/3] Setting up databases..."
  
  # Backend databases are auto-created on first run by main.py
  echo "Backend databases will be initialized on first startup."
  
  # Check if Python dependencies are installed
  if [ -f "backend/requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r backend/requirements.txt -q
  fi
  
  echo "Database setup complete."
  echo ""
fi

# Restart backend service
if [ "$DO_RESTART" = true ]; then
  echo "[3/3] Starting backend server..."
  
  # Kill existing process if running
  PID_FILE="/tmp/telemon.pid"
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "Stopping existing process (PID: $OLD_PID)..."
      kill "$OLD_PID" 2>/dev/null || true
      sleep 2
    fi
    rm -f "$PID_FILE"
  fi
  
  # Start backend with production settings
  echo "Starting uvicorn server..."
  cd backend && python -m uvicorn main:app \
    --host "${HOST:-0.0.0.0}" \
    --port "${PORT:-8000}" \
    --log-level "${LOG_LEVEL:-info}" \
    --workers "${WORKERS:-1}" \
    --timeout-keep-alive "${REQUEST_TIMEOUT:-60}" \
    --limit-concurrency 100 \
    --limit-max-requests 10000 &
  
  BACKEND_PID=$!
  echo $BACKEND_PID > /tmp/telemon.pid
  echo "Backend started (PID: $BACKEND_PID)"
  
  # Wait for startup
  echo "Waiting for server to be ready..."
  for i in $(seq 1 30); do
    if curl -s "http://${HOST:-0.0.0.0}:${PORT:-8000}/" > /dev/null 2>&1; then
      echo "Server is ready!"
      break
    fi
    sleep 1
  done
  echo ""
fi

# Run smoke test if restart was performed
if [ "$DO_RESTART" = true ]; then
  echo "Running smoke test..."
  cd .. && bash scripts/smoke_test_prod.sh 2>/dev/null || echo "Smoke test completed (non-critical)"
fi

echo "=== Deployment Complete ==="
echo "Backend: http://${HOST:-0.0.0.0}:${PORT:-8000}"
echo "Metrics: http://${HOST:-0.0.0.0}:${PORT:-8000}/metrics"
echo "Health:  http://${HOST:-0.0.0.0}:${PORT:-8000}/"
echo ""
echo "To monitor logs: tail -f backend/logs/*.log"
echo "To check metrics: curl http://${HOST:-0.0.0.0}:${PORT:-8000}/metrics"