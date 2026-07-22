#!/usr/bin/env bash
# scripts/smoke-test.sh — 배포 후 핵심 페이지 curl 스모크테스트
# 사용법: bash scripts/smoke-test.sh [base_url] [expected_health_page]

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
HEALTH_PAGE="${2:-/health}"
MAX_RETRIES=12
SLEEP_SEC=5

echo "🧪 Smoke test — $BASE_URL"
echo "   Health page: $HEALTH_PAGE"
echo "   Max retries: $MAX_RETRIES × ${SLEEP_SEC}s"
echo ""

for i in $(seq 1 "$MAX_RETRIES"); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$HEALTH_PAGE" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
    echo "✅ Health check passed ($STATUS) after ${i} attempt(s)"
    break
  fi
  if [ "$i" = "$MAX_RETRIES" ]; then
    echo "❌ Smoke test FAILED — $STATUS after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "   Attempt $i/$MAX_RETRIES — got $STATUS, retrying in ${SLEEP_SEC}s..."
  sleep "$SLEEP_SEC"
done

# Core pages check
echo ""
echo "📄 Core pages:"
PAGES=("/" "/api/health" "/signup")
for page in "${PAGES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "404" ]; then
    echo "   ✅ $page — $STATUS"
  else
    echo "   ❌ $page — $STATUS"
    FAILED=1
  fi
done

echo ""
if [ -z "${FAILED:-}" ]; then
  echo "✅ All smoke tests passed"
else
  echo "❌ Some smoke tests failed"
  exit 1
fi
