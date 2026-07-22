#!/usr/bin/env bash
# check-env-sync.sh — .env.example vs real .env 키 누락 감지
#
# Usage:
#   ./scripts/check-env-sync.sh                     # frontend 체크
#   ./scripts/check-env-sync.sh backend             # backend 체크
#   ./scripts/check-env-sync.sh --fix               # 누락키를 .env에 자동 추가 (주석 처리)
#
# Exit code: 0 = OK, 1 = 누락 있음

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-frontend}"
FIX="${2:-}"

case "$MODE" in
  frontend)
    ENV_FILE="$ROOT/.env"
    EXAMPLE="$ROOT/.env.example"
    ;;
  backend)
    ENV_FILE="$ROOT/telegram-dashboard-backend/.env"
    EXAMPLE="$ROOT/telegram-dashboard-backend/.env.example"
    ;;
  --fix)
    ENV_FILE="$ROOT/.env"
    EXAMPLE="$ROOT/.env.example"
    FIX="--fix"
    ;;
  *)
    echo "Usage: $0 [frontend|backend|--fix]"
    exit 2
    ;;
esac

if [ ! -f "$EXAMPLE" ]; then
  echo "❌ .env.example not found at $EXAMPLE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env not found at $ENV_FILE"
  exit 1
fi

MISSING=()

while IFS='=' read -r key _; do
  # skip blank, comment, or value-only lines
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  # skip keys that already exist in .env
  grep -q "^${key}=" "$ENV_FILE" && continue
  MISSING+=("$key")
done < <(grep -v '^#' "$EXAMPLE" | grep '=')

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "✅ $MODE .env is in sync with .env.example"
  exit 0
fi

echo "⚠️  ${#MISSING[@]} key(s) missing from $ENV_FILE:"
printf '   - %s\n' "${MISSING[@]}"

if [ "$FIX" = "--fix" ]; then
  for key in "${MISSING[@]}"; do
    value=$(grep "^${key}=" "$EXAMPLE" | cut -d'=' -f2-)
    echo "# auto-added by check-env-sync.sh" >> "$ENV_FILE"
    echo "${key}=${value}" >> "$ENV_FILE"
  done
  echo "✅ Added ${#MISSING[@]} key(s) to $ENV_FILE (commented)"
fi

exit 1
