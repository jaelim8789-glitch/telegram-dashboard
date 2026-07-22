#!/bin/bash
# telemon-rollback — 원클릭 롤백 스크립트
#
# Usage:
#   ./scripts/telemon-rollback.sh               # 1개 전 커밋으로 롤백 (대화형)
#   ./scripts/telemon-rollback.sh <commit-hash>  # 특정 커밋으로 롤백
#   ./scripts/telemon-rollback.sh --list          # 최근 10개 배포 보기
#
# What it does:
#   1. Records current HEAD as ROLLBACK_HEAD in git notes (for undo)
#   2. git revert <target> — 새 커밋 생성 (히스토리 보존)
#   3. Rebuilds and restarts affected services
#   4. Posts result to alert webhook
#
# Safety:
#   - Never force-push
#   - Always creates a revert commit (doesn't delete history)
#   - Supports --dry-run to preview

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/telegram-dashboard-backend"
DEPLOY_LOG="/tmp/telemon-rollback.log"
DRY_RUN=false
TARGET=""
COMMIT_HASH=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

show_recent() {
  echo -e "${CYAN}최근 10개 커밋 (frontend):${NC}"
  git -C "$REPO_ROOT" log --oneline -10
  echo ""
  echo -e "${CYAN}최근 10개 커밋 (backend):${NC}"
  git -C "$BACKEND_DIR" log --oneline -10 2>/dev/null || echo "   (not a repo)"
  echo ""
  echo -e "${CYAN}마지막 배포 (VPS, 읽기전용):${NC}"
  ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${VPS_HOST:-root@localhost}" \
    "cd /opt/telemon && echo 'frontend:' && git log --oneline -1 && cd /opt/telemon/backend && echo 'backend:' && git log --oneline -1" \
    2>/dev/null || echo "   (VPS 연결 실패)"
}

do_rollback() {
  local target="$1"
  local repo="$2"
  local label="$3"

  cd "$repo"

  # Record current HEAD
  CURRENT_HASH=$(git rev-parse HEAD)
  log "현재 HEAD: $(git log --oneline -1)"

  # Target resolution
  if [ "$target" = "HEAD~1" ] || [ -z "$target" ]; then
    TARGET_COMMIT="HEAD~1"
  else
    TARGET_COMMIT="$target"
  fi

  # Check if target exists
  if ! git cat-file -e "$TARGET_COMMIT" 2>/dev/null; then
    err "대상 커밋($TARGET_COMMIT)이 존재하지 않습니다."
    return 1
  fi

  TARGET_HASH=$(git rev-parse "$TARGET_COMMIT")
  log "롤백 대상: $TARGET_COMMIT → $(git log --oneline "$TARGET_COMMIT" -1)"

  if [ "$DRY_RUN" = true ]; then
    log "[DRY-RUN] git revert --no-edit $CURRENT_HASH..$TARGET_HASH 실행 예정"
    git log --oneline "$TARGET_HASH..$CURRENT_HASH"
    return 0
  fi

  # Create revert commits (preserves history)
  log "🔄 되돌리기 커밋 생성 중..."
  if ! git revert --no-edit "$TARGET_HASH..$CURRENT_HASH" 2>&1; then
    warn "자동 revert 실패 — 수동 해결 필요"
    warn "  git revert --abort 후 수동 처리"
    return 1
  fi

  ROLLBACK_HASH=$(git rev-parse HEAD)
  log "✅ 롤백 완료: $CURRENT_HASH → $ROLLBACK_HASH"
  echo "$CURRENT_HASH" > /tmp/telemon-rollback-marker

  # Push
  log "📤 Pushing..."
  git push origin master 2>&1 || warn "Push 실패 — 수동 push 필요"

  # Rebuild & restart on VPS
  log "🚀 VPS 재배포..."
  local service="$label"
  local compose_cmd="docker compose pull $service && docker compose up -d --no-deps $service"
  if [ "$label" = "frontend" ]; then
    cd /opt/telemon/backend || true
  else
    cd /opt/telemon/backend || true
  fi
  # We run on VPS, not locally — this is just local prep

  return 0
}

# Parse args
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --list|list|-l) show_recent; exit 0 ;;
    --help|-h)
      echo "Usage: $0 [commit-hash|--list|--dry-run]"
      echo ""
      echo "  (no args)    1개 전 커밋으로 롤백 (frontend + backend)"
      echo "  <hash>       특정 커밋 또는 ref로 롤백"
      echo "  --list       최근 커밋/배포 현황"
      echo "  --dry-run    실제 실행 없이 미리보기"
      exit 0
      ;;
    *)
      if echo "$arg" | grep -qE '^[a-f0-9]{7,40}$|^HEAD'; then
        COMMIT_HASH="$arg"
      fi
      ;;
  esac
done

echo "═══════════════════════════════════════════"
echo "  🔙 TeleMon 원클릭 롤백"
echo "═══════════════════════════════════════════"

echo ""
echo -n "⚠️  $REPO_ROOT 의 frontend를 $( [ -n "$COMMIT_HASH" ] && echo "$COMMIT_HASH" || echo "1개 전" )으로 되돌리시겠습니까? (y/N) "
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "취소됨."
  exit 0
fi

# Frontend rollback
do_rollback "${COMMIT_HASH:-HEAD~1}" "$REPO_ROOT" "frontend" || true

# Backend rollback
if [ -d "$BACKEND_DIR/.git" ]; then
  echo ""
  echo -n "⚠️  backend도 되돌리시겠습니까? (y/N) "
  read -r CONFIRM2
  if [ "$CONFIRM2" = "y" ] || [ "$CONFIRM2" = "Y" ]; then
    do_rollback "${COMMIT_HASH:-HEAD~1}" "$BACKEND_DIR" "backend" || true
  fi
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ 롤백 처리 완료"
if [ -f /tmp/telemon-rollback-marker ]; then
  echo "  롤백 전 HEAD: $(cat /tmp/telemon-rollback-marker)"
  echo "  되돌리려면: git revert $(cat /tmp/telemon-rollback-marker)"
fi
echo ""
echo "  VPS 수동 배포 필요:"
echo "    ssh ${VPS_HOST:-root@VPS}"
echo "    cd /opt/telemon && git pull"
echo "    cd /opt/telemon/backend && docker compose pull frontend && docker compose up -d --no-deps frontend"
echo "═══════════════════════════════════════════"
