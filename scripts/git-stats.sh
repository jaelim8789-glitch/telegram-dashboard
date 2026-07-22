#!/usr/bin/env bash
# Show contributor stats for the past week
echo "=== Commits this week ==="
git shortlog -sn --all --since='1 week ago'
echo ""
echo "=== File hotspots (most changed) ==="
git log --since='1 week ago' --name-only --pretty=format: | sort | uniq -c | sort -rn | head -15
