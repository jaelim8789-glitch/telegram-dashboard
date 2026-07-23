#!/bin/bash
# ============================================================
# TeleMon 개발 초고속 설정 — 신규 머신/워크트리에서 1회 실행
# ============================================================
set -e

echo "🚀 TeleMon Dev Speed Setup"
echo ""

# 1. pnpm store를 SSD/Temp로
STORE_DIR="${PNPM_STORE_DIR:-$HOME/.pnpm-store}"
pnpm config set store-dir "$STORE_DIR" --global 2>/dev/null || true
echo "✅ pnpm store: $STORE_DIR"

# 2. pnpm approve-builds (조용히)
pnpm approve-builds 2>/dev/null || echo "ℹ️ approve-builds skipped (non-interactive)"

# 3. git alias
git config --local alias.cm "commit -m"
git config --local alias.cma "commit -a -m"
git config --local alias.co checkout
git config --local alias.br branch
git config --local alias.st status
git config --local alias.lg "log --oneline --graph --all -20"
git config --local alias.pushf "push --no-verify"
git config --local alias.commitf "commit --no-verify -m"
echo "✅ Git alias 설정"

# 4. gh alias (GitHub CLI)
if command -v gh &>/dev/null; then
  gh alias set --clobber prc 'pr create --fill' 2>/dev/null || true
  gh alias set --clobber prv 'pr view --web' 2>/dev/null || true
  echo "✅ gh alias 설정"
fi

echo ""
echo "🎉 완료! 이제 커밋:   git cm \"메시지\""
echo "  푸시:   git pushf"
echo "  PR 생성: gh prc"
echo "  로그:   git lg"
