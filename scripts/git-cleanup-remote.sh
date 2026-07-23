#!/usr/bin/env bash
# Delete already-merged remote branches from origin
echo "=== Scanning merged remote branches ==="
git fetch --prune
git branch -r --merged origin/master | grep -v 'origin/master\|origin/main\|origin/HEAD\|origin/release\|origin/staging' | sed 's/origin\///' | while read branch; do
  echo "Deleting origin/$branch..."
  git push origin --delete "$branch" 2>/dev/null || echo "  (already deleted or protected)"
done
echo "=== Complete ==="
