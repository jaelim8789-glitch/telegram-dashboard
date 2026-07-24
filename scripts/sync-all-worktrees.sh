#!/bin/bash
# sync-all-worktrees: 모든 작업트리를 origin/master와 동기화

WORKTREES=(
  "c:/Dev/TeleMon-release"
  "c:/Dev/TeleMon-cline"
  "c:/Dev/TeleMon-opencode"
  "c:/Dev/TeleMon-kiro"
)

for WT in "${WORKTREES[@]}"; do
  if [ -d "$WT" ]; then
    echo "🔄 Syncing $WT..."
    cd "$WT"
    git fetch origin master
    BEHIND=$(git rev-list --count HEAD..origin/master)
    if [ "$BEHIND" -gt 0 ]; then
      echo "   ⚠️  $BEHIND behind. Rebasing..."
      git rebase origin/master || echo "   ❌ Rebase conflict in $WT"
    else
      echo "   ✅ Up to date"
    fi
  fi
done
