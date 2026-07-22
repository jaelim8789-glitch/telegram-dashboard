#!/usr/bin/env bash
# List all branches, show merge status vs master
echo "=== Branch merge status ==="
echo ""
printf "%-40s %s\n" "BRANCH" "STATUS"
echo "------------------------------------------------------------"
git for-each-ref --format="%(refname:short)" refs/heads/ refs/remotes/origin/ | grep -v "origin/HEAD" | sort -u | while read branch; do
  display=$(echo "$branch" | sed 's/^origin\///')
  if git merge-base --is-ancestor "$branch" origin/master 2>/dev/null; then
    ahead=$(git rev-list --count origin/master.."$branch" 2>/dev/null || echo "?")
    if [ "$ahead" -eq 0 ] 2>/dev/null; then
      printf "%-40s MERGED\n" "$display"
    else
      printf "%-40s AHEAD %s commits\n" "$display" "$ahead"
    fi
  else
    printf "%-40s DIVERGED\n" "$display"
  fi
done 2>/dev/null
