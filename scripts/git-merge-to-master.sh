#!/bin/bash
# git-merge-to-master — 안전한 master 병합 래퍼
#
# 용도: master에 직접 push하는 대신, feat/* 브랜치에서 이 스크립트로 merge
#   - 현재 브랜치를 master로 rebase
#   - GitHub Actions CI 통과 확인 (gh CLI 필요)
#   - master에 merge 후 push
#
# Usage:
#   ./scripts/git-merge-to-master.sh          # 현재 브랜치 → master
#   ./scripts/git-merge-to-master.sh feat/xxx  # 특정 브랜치 → master
#   ./scripts/git-merge-to-master.sh --check   # CI 상태만 확인
#
# Prerequisites: gh CLI (gh auth login)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

CURRENT_BRANCH=$(git branch --show-current)
TARGET_BRANCH="${1:-$CURRENT_BRANCH}"
CHECK_ONLY=false

if [ "$1" = "--check" ]; then
  CHECK_ONLY=true
  TARGET_BRANCH="$CURRENT_BRANCH"
fi

if [ "$TARGET_BRANCH" = "master" ]; then
  err "직접 master에서 실행할 수 없습니다. feat/* 브랜치에서 실행하세요."
  exit 1
fi

# 1. Verify local checks pass
log "📦 Running verify..."
cd "$(git rev-parse --show-toplevel)"
npm run verify 2>&1 || {
  err "npm run verify 실패. 먼저 수정하세요."
  exit 1
}
log "✅ verify 통과"

# 2. Fetch latest master
log "📡 Fetching latest master..."
git fetch origin master 2>&1

# 3. Rebase onto master
log "🔄 Rebasing $TARGET_BRANCH onto master..."
git rebase origin/master 2>&1 || {
  err "Rebase 충돌 발생. 수동 해결 후 다시 실행하세요."
  err "  git rebase --abort  # 취소"
  err "  git rebase origin/master  # 재시도"
  exit 1
}
log "✅ Rebase 완료"

# 4. Check CI status (if gh CLI available)
if command -v gh &>/dev/null; then
  log "🤖 Checking CI status..."
  LATEST_RUN=$(gh run list --branch "$TARGET_BRANCH" --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "unknown")
  if [ "$LATEST_RUN" = "success" ] || [ "$LATEST_RUN" = "unknown" ]; then
    log "✅ CI: $LATEST_RUN"
  elif [ "$LATEST_RUN" = "failure" ]; then
    warn "⚠️  최근 CI 실행이 실패했습니다 ($LATEST_RUN)"
    echo -n "계속 진행하시겠습니까? (y/N) "
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
      log "취소됨."
      exit 0
    fi
  fi
else
  warn "gh CLI 없음 — CI 상태를 건너뜁니다."
fi

if [ "$CHECK_ONLY" = true ]; then
  log "✅ Check only mode — 완료되었습니다. 실제 merge는 실행되지 않았습니다."
  exit 0
fi

# 5. Push branch (trigger CI)
log "📤 Pushing $TARGET_BRANCH..."
git push origin "$TARGET_BRANCH" 2>&1

# 6. Checkout master, merge, push
log "🔀 Merging into master..."
git checkout master 2>&1
git pull origin master 2>&1
git merge --ff-only "$TARGET_BRANCH" 2>&1 || {
  warn "Fast-forward merge 실패 — create-merge-commit 시도..."
  git merge --no-ff "$TARGET_BRANCH" -m "merge: $TARGET_BRANCH into master" 2>&1
}

log "📤 Pushing master..."
git push origin master 2>&1

# 7. Go back
git checkout "$TARGET_BRANCH" 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ $TARGET_BRANCH → master merge 완료"
echo "  브랜치 삭제: git branch -d $TARGET_BRANCH && git push origin --delete $TARGET_BRANCH"
echo "═══════════════════════════════════════════"
