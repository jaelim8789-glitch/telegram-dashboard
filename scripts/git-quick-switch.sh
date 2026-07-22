#!/usr/bin/env bash
# Auto-save working changes as a WIP commit, switch to new branch, then pop
set -e
BRANCH="$1"
if [ -z "$BRANCH" ]; then
  echo "Usage: git-quick-switch.sh <branch-name>"
  exit 1
fi
echo "=== Saving WIP ==="
git add -A
git stash push -m "auto-stash before switching to $BRANCH"
echo "=== Switching to $BRANCH ==="
git checkout "$BRANCH"
echo "=== Restoring WIP ==="
git stash pop
echo "=== Done ==="
