#!/usr/bin/env bash
# 긴급 전체 중단 해제
# 실행: scripts/team/resume-all.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [ -f ".kilo/PAUSE" ]; then
  rm .kilo/PAUSE
  echo "✅ PAUSE 해제됨"
else
  echo "ℹ️  현재 PAUSE 상태 아님"
fi

# TEAM_STATUS.md에서 PAUSE 메시지 제거
if [ -f "TEAM_STATUS.md" ]; then
  # PAUSE 라인 제거
  sed -i '1,/^---$/ { /🔴🔴🔴/,/^---$/ d }' TEAM_STATUS.md
  sed -i '/^> ⚠️ 위 메시지는/,/^해제/d' TEAM_STATUS.md
  echo "✅ TEAM_STATUS.md 정리 완료"
fi

echo "🟢 모든 작업 재개 가능"
