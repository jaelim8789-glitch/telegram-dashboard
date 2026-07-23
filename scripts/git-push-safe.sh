#!/bin/bash
# git-push-safe — Push with automatic fetch+rebase+retry
#
# Usage: git push-safe [origin] [branch]
#
# Features:
#   1. Auto-fetch before push
#   2. If push fails with "cannot lock ref" or non-fast-forward, auto rebase + retry
#   3. Max 3 retries with exponential backoff
#
# Install: alias git push="git-push-safe"  # or use the wrapper below

set -euo pipefail

ORIGIN="${1:-origin}"
BRANCH="${2:-$(git branch --show-current)}"
MAX_RETRIES=3
RETRY_DELAY=2

echo "🔒 [push-safe] Pushing ${BRANCH} to ${ORIGIN}..."

for attempt in $(seq 1 "$MAX_RETRIES"); do
  # Fetch latest
  echo "📡 [push-safe] Fetching ${ORIGIN}/${BRANCH}..."
  git fetch "$ORIGIN" "$BRANCH" 2>&1 || true

  # Try push
  OUTPUT=$(git push "$ORIGIN" "$BRANCH" 2>&1) && {
    echo "✅ [push-safe] Push successful"
    echo "$OUTPUT"
    exit 0
  }

  echo "⚠️  [push-safe] Push failed (attempt ${attempt}/${MAX_RETRIES})"

  # Check if it's a lock/conflict error
  if echo "$OUTPUT" | grep -qE "cannot lock ref|non-fast-forward|fetch first|rejected"; then
    echo "🔄 [push-safe] Auto-rebasing onto ${ORIGIN}/${BRANCH}..."
    git pull --rebase "$ORIGIN" "$BRANCH" 2>&1 || {
      echo "❌ [push-safe] Rebase failed. Manual resolution needed."
      echo "   git rebase --abort  # to cancel"
      exit 1
    }
    echo "✅ [push-safe] Rebase complete. Retrying..."
    sleep "$RETRY_DELAY"
    RETRY_DELAY=$((RETRY_DELAY * 2))
  else
    echo "❌ [push-safe] Unrecoverable error:"
    echo "$OUTPUT"
    exit 1
  fi
done

echo "❌ [push-safe] Max retries exceeded. Push aborted."
exit 1
