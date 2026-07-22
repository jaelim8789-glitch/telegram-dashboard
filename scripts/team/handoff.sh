#!/usr/bin/env bash
# 에이전트 인수인계 자동 정리
# 실행: scripts/team/handoff.sh
set -euo pipefail

SESSION_ID="${1:-unknown}"
echo "# 🤝 에이전트 인수인계 — $(date '+%Y-%m-%d %H:%M')" > .kilo/handoff-${SESSION_ID}.md
echo "" >> .kilo/handoff-${SESSION_ID}.md
echo "## 🎯 지금까지 한 일" >> .kilo/handoff-${SESSION_ID}.md
git diff --name-only --diff-filter=AM HEAD~5..HEAD 2>/dev/null | head -30 >> .kilo/handoff-${SESSION_ID}.md
echo "" >> .kilo/handoff-${SESSION_ID}.md

echo "## ⛔ 막힌 지점 / 미해결" >> .kilo/handoff-${SESSION_ID}.md
grep -r -l "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10 >> .kilo/handoff-${SESSION_ID}.md
echo "" >> .kilo/handoff-${SESSION_ID}.md

echo "## ▶️ 다음 할 일" >> .kilo/handoff-${SESSION_ID}.md
echo "- (여기에 작성)" >> .kilo/handoff-${SESSION_ID}.md
echo "" >> .kilo/handoff-${SESSION_ID}.md

echo "## 📦 최근 커밋" >> .kilo/handoff-${SESSION_ID}.md
git log --oneline -5 --format="%h %s (%ar)" 2>/dev/null >> .kilo/handoff-${SESSION_ID}.md

echo "✅ 인수인계 파일 생성: .kilo/handoff-${SESSION_ID}.md"
echo "   다음 사람은 이 파일을 읽고 이어서 작업하세요."
