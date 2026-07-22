#!/usr/bin/env bash
# TEAM_STATUS.md → GitHub Issue 자동 발급
# TEAM_STATUS.md에서 "- [ ] " 항목을 찾아 GitHub Issue로 생성
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if ! command -v gh &>/dev/null; then
  echo "❌ gh CLI 필요: https://cli.github.com/"
  exit 1
fi

TASKS=$(grep -E '^- \[ \] ' TEAM_STATUS.md | sed 's/^- \[ \] \[\([^]]*\)\] *(.*)/- \1: \2/' || true)
if [ -z "$TASKS" ]; then
  echo "✅ 발급할 새 작업 없음"
  exit 0
fi

echo "$TASKS" | while IFS= read -r line; do
  TITLE=$(echo "$line" | sed 's/^- //')
  # 중복 체크: 이미 같은 제목의 open issue가 있는지
  EXISTING=$(gh issue list --limit 50 --json title 2>/dev/null | jq -r ".[].title" | grep -F "$TITLE" | head -1)
  if [ -n "$EXISTING" ]; then
    echo "⏭️  이미 존재: $TITLE"
    continue
  fi
  gh issue create --title "$TITLE" --body "자동 생성 (TEAM_STATUS.md)\n\n상세: $line" --label task 2>/dev/null && echo "✅ 생성: $TITLE" || echo "⚠️  생성 실패: $TITLE"
done

echo "🏁 완료"
