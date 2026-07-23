#!/usr/bin/env bash
set -e
echo "=== TeleMon Clean Merged Branches ==="
git remote prune origin
BRANCHES=$(git branch --merged origin/master | grep -vE '^\*|master$|main$')
if [ -z "$BRANCHES" ]; then
  echo "No merged branches to delete."
  exit 0
fi
echo "Deleting:"
echo "$BRANCHES"
echo "$BRANCHES" | xargs -r git branch -d
echo "Done."
