#!/usr/bin/env bash
# scripts/worktree-dashboard.sh — ???? ?? ?? ??? ??
# ???: bash scripts/worktree-dashboard.sh

set -euo pipefail

echo "??????????????????????????????????????????????????????????????"
echo "  ?? TeleMon Worktree Dashboard"
echo "  $(date '+%Y-%m-%d %H:%M:%S KST')"
echo "??????????????????????????????????????????????????????????????"
echo ""

PARENT_DIR="C:/Dev"

# List all worktrees from the parent repo
if [ -d "$PARENT_DIR" ]; then
  for wt in "$PARENT_DIR"/TeleMon-*; do
    [ -d "$wt" ] || continue
    NAME=$(basename "$wt")
    echo "?? $NAME ??"
    
    if git -C "$wt" rev-parse --git-dir > /dev/null 2>&1; then
      BRANCH=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(detached)")
      COMMIT=$(git -C "$wt" log --oneline -1 2>/dev/null || echo "")
      DIRTY=""
      if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
        DIRTY=" ??  uncommitted"
      fi
      AHEAD=$(git -C "$wt" rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
      BEHIND=$(git -C "$wt" rev-list --count HEAD..@{u} 2>/dev/null || echo "?")
      echo "   Branch: $BRANCH$DIRTY"
      echo "   Latest: $COMMIT"
      echo "   ${AHEAD} ahead · ${BEHIND} behind origin"
    else
      echo "   (not a git directory)"
    fi
    echo ""
  done
else
  echo "??  $PARENT_DIR not found — no canonical worktrees"
  echo "   (running in emergency/backup session)"
  echo ""
fi

# Current repo status
echo "?? Current (emergency session) ??"
CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
CUR_COMMIT=$(git log --oneline -1 2>/dev/null || echo "")
CUR_DIRTY=$(git status --short 2>/dev/null | head -5 || echo "")
echo "   Path: $(pwd)"
echo "   Branch: $CUR_BRANCH"
echo "   Latest: $CUR_COMMIT"
if [ -n "$CUR_DIRTY" ]; then
  echo "   ??  Uncommitted changes:"
  echo "$CUR_DIRTY" | sed 's/^/        /'
fi
echo ""

# Backend repo status
if [ -d "telegram-dashboard-backend/.git" ]; then
  echo "?? Backend (separate repo) ??"
  BE_BRANCH=$(git -C telegram-dashboard-backend rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  BE_COMMIT=$(git -C telegram-dashboard-backend log --oneline -1 2>/dev/null || echo "")
  BE_DIRTY=$(git -C telegram-dashboard-backend status --short 2>/dev/null | head -5 || echo "")
  echo "   Path: telegram-dashboard-backend/"
  echo "   Branch: $BE_BRANCH"
  echo "   Latest: $BE_COMMIT"
  if [ -n "$BE_DIRTY" ]; then
    echo "   ??  Uncommitted changes:"
    echo "$BE_DIRTY" | sed 's/^/        /'
  fi
fi

echo ""
echo "??????????????????????????????????????????????????????????????"
