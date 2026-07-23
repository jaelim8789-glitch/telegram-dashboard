#!/bin/bash
# ============================================================
# TeleMon 개발 환경 싱크 스크립트 — 새 worktree 생성 후 실행
# 사용법: bash scripts/sync-worktree.sh /path/to/new-worktree
# ============================================================
set -e

NEW_WT="$1"
ROOT="$(git rev-parse --show-toplevel)"

if [ -z "$NEW_WT" ]; then
  echo "사용법: bash scripts/sync-worktree.sh /path/to/new-worktree"
  exit 1
fi

echo "📦 TeleMon Worktree Sync"
echo "  Root: $ROOT"
echo "  New:  $NEW_WT"

# 1. .env.local 복사
if [ -f "$ROOT/.env.local" ]; then
  cp "$ROOT/.env.local" "$NEW_WT/.env.local"
  echo "✅ .env.local 복사"
fi

# 2. pnpm store 공유 (하드링크)
if [ -d "$ROOT/node_modules" ] && [ ! -d "$NEW_WT/node_modules" ]; then
  echo "⏳ pnpm install (빠름: store 공유)..."
  cd "$NEW_WT" && pnpm install --prefer-offline 2>&1 | tail -3
  echo "✅ node_modules 설치"
fi

# 3. .husky 복사 (심볼릭 링크는 안 됨)
cp -r "$ROOT/.husky/_" "$NEW_WT/.husky/" 2>/dev/null || true

echo "🎉 Sync 완료: $NEW_WT"
