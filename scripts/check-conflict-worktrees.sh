#!/usr/bin/env bash
# scripts/check-conflict-worktrees.sh — 워크트리 동시편집 감지 스크립트
# 사용법: bash scripts/check-conflict-worktrees.sh
# 시작 시점에 실행하면 같은 브랜치를 여러 워크트리에서 편집 중인지 경고

set -euo pipefail

PARENT_DIR="C:/Dev"
CONFLICTS=0

echo "🔍 Checking for concurrent worktree edits..."
echo ""

declare -A BRANCH_COUNT

if [ -d "$PARENT_DIR" ]; then
  for wt in "$PARENT_DIR"/TeleMon-*; do
    [ -d "$wt" ] || continue
    NAME=$(basename "$wt")
    BRANCH=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ -n "$BRANCH" ] && [ "$BRANCH" != "HEAD" ]; then
      BRANCH_COUNT["$BRANCH"]="${BRANCH_COUNT[$BRANCH]:-}$NAME "
    fi
  done
fi

# Also check current repo
CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -n "$CUR_BRANCH" ] && [ "$CUR_BRANCH" != "HEAD" ]; then
  BRANCH_COUNT["$CUR_BRANCH"]="${BRANCH_COUNT[$CUR_BRANCH]:-}(current) "
fi

for branch in "${!BRANCH_COUNT[@]}"; do
  COUNT=$(echo "${BRANCH_COUNT[$branch]}" | wc -w)
  if [ "$COUNT" -gt 1 ]; then
    echo "⚠️  CONFLICT RISK: Branch '$branch' used by $COUNT worktrees:"
    for wt in ${BRANCH_COUNT[$branch]}; do
      echo "     - $wt"
    done
    CONFLICTS=$((CONFLICTS + 1))
  fi
done

if [ "$CONFLICTS" -eq 0 ]; then
  echo "✅ All worktrees are on distinct branches — no conflict risk"
else
  echo ""
  echo "⚠️  $CONFLICTS branch(es) have concurrent edits — coordinate carefully!"
  echo "   Run 'bash scripts/team/pause-all.sh \"사유\"' if needed"
fi
