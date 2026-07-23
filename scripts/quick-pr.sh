#!/usr/bin/env bash
set -e
echo "=== TeleMon Quick PR ==="
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TITLE="${1:-$(git log -1 --pretty=%s)}"
LABELS="${2:-}"
REVIEWERS="${3:-jaelim8789-glitch}"
gh pr create --title "$TITLE" --body "Automated PR from branch \`$BRANCH\`." --reviewer "$REVIEWERS" --label "$LABELS" --fill
echo "PR created from branch: $BRANCH"
