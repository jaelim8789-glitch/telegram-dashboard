#!/usr/bin/env bash
# 긴급 전체 중단 스위치
# 실행: scripts/team/pause-all.sh [이유]
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

REASON="${1:-긴급 상황으로 인한 push 중지 요청}"
AUTHOR=$(git config user.name || "unknown")

# 🔴 PAUSE 신호를 TEAM_STATUS.md 상단에 기록
PAUSE_MSG="🔴🔴🔴 전체 중단 (ALL PAUSE) 🔴🔴🔴
요청자: $AUTHOR
시각: $(date '+%Y-%m-%d %H:%M KST')
사유: $REASON
상태: 모든 agent는 push/merge/commit을 중지하세요."

if [ -f "TEAM_STATUS.md" ]; then
  # 기존 내용 위에 PAUSE 신호 삽입
  cp TEAM_STATUS.md TEAM_STATUS.md.bak
  echo "$PAUSE_MSG" > TEAM_STATUS.md
  echo "" >> TEAM_STATUS.md
  echo "---" >> TEAM_STATUS.md
  echo "> ⚠️ 위 메시지는 $AUTHOR 에 의해 $(date '+%Y-%m-%d %H:%M') 에 설정되었습니다." >> TEAM_STATUS.md
  echo "> 해제하려면: bash scripts/team/resume-all.sh" >> TEAM_STATUS.md
  echo "" >> TEAM_STATUS.md
  head -n 10 TEAM_STATUS.md.bak >> TEAM_STATUS.md
  rm TEAM_STATUS.md.bak
fi

# PAUSE 파일 생성 (pre-push/pre-commit 훅이 읽음)
echo "$PAUSE_MSG" > .kilo/PAUSE
echo "✅ PAUSE 신호 기록됨"
echo ""
echo "$PAUSE_MSG"
echo ""
echo "⚠️  모든 agent는 즉시 push/merge/commit을 중지하세요."
echo "   해제: bash scripts/team/resume-all.sh"
