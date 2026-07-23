#!/usr/bin/env bash
# 주간 변경 리포트 자동 생성
# 실행: scripts/team/weekly-report.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

SINCE="${1:-"7 days ago"}"
REPORT=".kilo/weekly-report-$(date +%Y%m%d).md"

echo "# 📊 주간 변경 리포트 — $(date '+%Y-%m-%d')" > "$REPORT"
echo "" >> "$REPORT"
echo "기간: $(date -d "$SINCE" '+%Y-%m-%d') ~ $(date '+%Y-%m-%d')" >> "$REPORT"
echo "" >> "$REPORT"

echo "## 📦 커밋 ($(git log --oneline --since="$SINCE" --format="%h" | wc -l)개)" >> "$REPORT"
git log --oneline --since="$SINCE" --format="%h %s (%ar, %an)" >> "$REPORT"
echo "" >> "$REPORT"

echo "## 📁 변경 파일 통계" >> "$REPORT"
echo "\`\`\`" >> "$REPORT"
git diff --stat --since="$SINCE" --diff-filter=AM | tail -1 >> "$REPORT"
echo "파일 수: $(git diff --name-only --since="$SINCE" --diff-filter=AM | wc -l)개" >> "$REPORT"
echo "\`\`\`" >> "$REPORT"
echo "" >> "$REPORT"

echo "## 📋 주요 변경 디렉토리" >> "$REPORT"
git diff --name-only --since="$SINCE" --diff-filter=AM | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn | head -15 >> "$REPORT"
echo "" >> "$REPORT"

echo "## 🏷️ 커밋 유형 분석" >> "$REPORT"
echo "\`\`\`" >> "$REPORT"
echo "feat: $(git log --oneline --since="$SINCE" --grep='^feat' | wc -l)"
echo "fix:  $(git log --oneline --since="$SINCE" --grep='^fix' | wc -l)"
echo "refactor: $(git log --oneline --since="$SINCE" --grep='^refactor' | wc -l)"
echo "chore: $(git log --oneline --since="$SINCE" --grep='^chore' | wc -l)"
echo "docs:  $(git log --oneline --since="$SINCE" --grep='^docs' | wc -l)"
echo "\`\`\`" >> "$REPORT"

echo "✅ 리포트 생성: $REPORT"
