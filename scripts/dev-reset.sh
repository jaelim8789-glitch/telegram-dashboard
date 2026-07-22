#!/usr/bin/env bash
# dev-reset.sh — 로컬 개발 환경 완전 초기화
# 캐시/노드모듈/빌드 찌꺼기/DB 데이터 전부 클린
#
# Usage:
#   ./scripts/dev-reset.sh              # 기본 정리
#   ./scripts/dev-reset.sh --hard        # + DB 데이터 삭제 (docker down -v)
#   ./scripts/dev-reset.sh --dry         # 실제 삭제 없이 무엇을 할지만 출력

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-normal}"
DRY=false

[ "$MODE" = "--dry" ] && DRY=true && MODE="normal"
[ "$MODE" = "--hard" ] && HARD=true || HARD=false

run() {
  if $DRY; then
    echo "  (dry-run) $*"
  else
    echo "  $*"
    "$@"
  fi
}

echo "━━━ TeleMon Dev Reset ━━━"
echo ""

# 1. Next.js 빌드 캐시
echo "📁 1. Next.js 빌드 캐시 (.next)..."
if [ -d "$ROOT/.next" ]; then
  run rm -rf "$ROOT/.next"
fi

# 2. node_modules
echo "📁 2. node_modules..."
if [ -d "$ROOT/node_modules" ]; then
  run rm -rf "$ROOT/node_modules"
fi

# 3. pnpm store 프루닝 (디스크만)
echo "📁 3. pnpm store prune..."
run pnpm store prune 2>/dev/null || true

# 4. ESLint 캐시
echo "📁 4. ESLint/Prettier 캐시..."
rm -f "$ROOT/.eslintcache" 2>/dev/null || true

# 5. Python __pycache__
echo "📁 5. Python __pycache__..."
find "$ROOT/telegram-dashboard-backend" -name "__pycache__" -type d -exec run rm -rf {} + 2>/dev/null || true
find "$ROOT/telegram-dashboard-backend" -name "*.pyc" -delete 2>/dev/null || true

# 6. Docker DB (--hard만)
if $HARD; then
  echo "📁 6. Docker DB 데이터 제거..."
  run docker compose -f "$ROOT/telegram-dashboard-backend/docker-compose.yml" down -v 2>/dev/null || true
fi

echo ""
echo "━━━ 완료 ━━━"
if $HARD; then
  echo "✅ 모든 캐시/모듈/DB 데이터 제거됨"
  echo "   재설치: pnpm install"
  echo "   DB 재시작: make db-up"
else
  echo "✅ 캐시/모듈 제거됨 (DB 데이터 유지)"
  echo "   재설치: pnpm install"
  echo "   (DB만 초기화하려면: make db-reset)"
fi
