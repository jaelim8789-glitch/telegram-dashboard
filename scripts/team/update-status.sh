#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

COMMIT_LINE=$(git log --oneline -1 --format="?? 최신 배포: \`%h\` %s (%ar by %an)")
CI_LINE=""
if command -v gh &>/dev/null; then
  CI_JSON=$(gh run list --limit 1 --json conclusion,displayTitle,headBranch 2>/dev/null || echo "[]")
  if [ "$CI_JSON" != "[]" ]; then
    CONCLUSION=$(echo "$CI_JSON" | jq -r '.[0].conclusion')
    TITLE=$(echo "$CI_JSON" | jq -r '.[0].displayTitle')
    [ "$CONCLUSION" = "success" ] && ICON="?" || ICON="?"
    CI_LINE="${ICON} CI: ${CONCLUSION} (${TITLE})"
  fi
  ISSUE_COUNT=$(gh issue list --limit 100 --json id 2>/dev/null | jq length)
  ISSUE_LINE="?? 미해결 이슈: ${ISSUE_COUNT}건"
fi

HEADER="# TeleMon 현황 & 실행

> 마지막 갱신: $(date '+%Y-%m-%d %H:%M KST')

## 1줄 요약

| 상태 | 내용 |
|------|------|
| ${COMMIT_LINE} |
| ${CI_LINE:-? CI 정보 없음} |
| ${ISSUE_LINE:-?? 미해결 이슈: 0건} |
"

# 기존 TEAM_STATUS.md의 헤더 영역 교체
CONTENT=$(cat TEAM_STATUS.md)
NEW_CONTENT=$(echo "$HEADER"; echo "$CONTENT" | sed '1,/^## /d')
echo "$NEW_CONTENT" > TEAM_STATUS.md

echo "? TEAM_STATUS.md 갱신 완료"
