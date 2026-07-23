#!/usr/bin/env bash
# 에이전트별 작업 로그 타임라인 뷰
# 오늘 누가 몇 시에 뭘 했는지 한눈에
# 실행: scripts/team/agent-timeline.sh [날짜]
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

DATE="${1:-$(date +%Y-%m-%d)}"

echo "📋 에이전트 작업 타임라인 — $DATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git log --all --since="${DATE} 00:00:00" --until="${DATE} 23:59:59" \
  --format="🕐 %ai  |  👤 %an  |  %s" --author="Qoder\|OpenCode\|Kilo\|Agent\|bot" 2>/dev/null | \
  sed 's/\([+-]..:..\)//' || echo "(기록 없음)"

echo ""
echo "📁 변경된 파일 (작업자별)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git log --all --since="${DATE} 00:00:00" --until="${DATE} 23:59:59" \
  --format="%an" --name-only 2>/dev/null | \
  awk '{
    if (NF > 0 && $0 !~ /^[a-zA-Z]/) files[author][$0]++
    else author = $0
  } END {
    for (a in files) {
      print "👤 " a
      for (f in files[a]) print "   📄 " f
    }
  }' | head -60

echo ""
echo "⏱️ 통계"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "커밋 수: $(git log --all --since="${DATE} 00:00:00" --until="${DATE} 23:59:59" --oneline | wc -l)"
echo "작업자: $(git log --all --since="${DATE} 00:00:00" --until="${DATE} 23:59:59" --format="%an" | sort -u | tr '\n' ' ')"
