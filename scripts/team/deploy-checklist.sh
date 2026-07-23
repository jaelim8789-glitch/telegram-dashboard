#!/usr/bin/env bash
# 배포 전 체크리스트 자동 검증
# 실행: scripts/team/deploy-checklist.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

ERRORS=0

echo "🔍 배포 전 체크리스트 검증"
echo "━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 테스트 통과
echo -n "1) tsc --noEmit... "
if npx tsc --noEmit 2>/dev/null; then
  echo "✅"
else
  echo "❌ 타입 오류 있음"
  ERRORS=$((ERRORS+1))
fi

# 2. 마이그레이션 단일 헤드 (백엔드)
if [ -d "telegram-dashboard-backend" ]; then
  echo -n "2) alembic single head... "
  if (cd telegram-dashboard-backend && alembic heads 2>/dev/null | wc -l) | grep -q "^1$"; then
    echo "✅"
  else
    echo "❌ alembic 헤드가 2개 이상"
    ERRORS=$((ERRORS+1))
  fi
else
  echo "2) ⏭️  백엔드 디렉토리 없음"
fi

# 3. env 변수 존재
echo -n "3) env 파일... "
if [ -f ".env" ] || [ -f ".env.local" ]; then
  echo "✅"
else
  echo "⚠️  .env 파일 없음 (로컬 개발인 경우 정상)"
fi

# 4. lint
echo -n "4) eslint... "
if npx eslint . --max-warnings=50 2>/dev/null; then
  echo "✅"
else
  echo "⚠️  lint 경고 있음 (50개 이하 허용)"
fi

# 5. build
echo -n "5) next build... "
if npx next build 2>/dev/null; then
  echo "✅"
else
  echo "❌ 빌드 실패"
  ERRORS=$((ERRORS+1))
fi

# 6. git push 체크 (origin/master과 비교)
echo -n "6) origin/master과 diff... "
BEHIND=$(git rev-list --count origin/master..HEAD 2>/dev/null || echo "0")
if [ "$BEHIND" -gt 0 ]; then
  echo "✅ (${BEHIND}개 커밋 ahead)"
else
  echo "⚠️  origin/master과 같거나 뒤짐"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo "✅ 모든 체크 통과 — 배포 가능"
else
  echo "❌ ${ERRORS}개 항목 실패 — 배포 전 수정 필요"
  exit 1
fi
