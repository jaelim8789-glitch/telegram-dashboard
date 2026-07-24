#!/bin/bash
# deploy-all: 전체 배포 (frontend + backend)
# 사용: kilo run deploy-all "commit message"

set -euo pipefail

MSG="${1:-auto: deploy $(date '+%Y-%m-%d %H:%M')}"

echo "🔍 Checking for unmerged commits..."
git fetch origin master
BEHIND=$(git rev-list --count HEAD..origin/master)
if [ "$BEHIND" -gt 0 ]; then
  echo "❌ $BEHIND commits behind origin/master. Pull first."
  exit 1
fi

echo "🏗️  Building frontend..."
pnpm run build

echo "📦 Committing..."
git add -A
git commit -m "$MSG" --no-verify

echo "🚀 Pushing frontend..."
git push origin master

echo "🐍 Deploying backend..."
cd telegram-dashboard-backend
git add -A
git commit -m "$MSG" || true
git push origin master

echo "✅ Deploy complete. CI will handle the rest."
