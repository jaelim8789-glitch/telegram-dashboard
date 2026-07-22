#!/bin/bash
# ============================================================================
# TeleMon One-Click Revert — "지난 정상 커밋으로 되돌리기"
#
# Finds the most recent "good" commit (tagged with stable-* or the last commit
# before the most recent N commits), checks it out, and prompts for
# confirmation before force-pushing.
#
# Usage:
#   bash scripts/revert_to_last_good.sh              # interactive
#   bash scripts/revert_to_last_good.sh --force       # skip confirmation
#   bash scripts/revert_to_last_good.sh --dry-run     # show what would happen
#   bash scripts/revert_to_last_good.sh --hard-reset  # git reset --hard, no push
# ============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
GIT_REPO_PATH="${GIT_REPO_PATH:-.}"
BRANCH="${BRANCH:-master}"
STABLE_TAG_PREFIX="${STABLE_TAG_PREFIX:-stable}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }
header()  { echo -e "\n${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}"; }

# ── Parse flags ──────────────────────────────────────────────────────────────

FORCE=false
DRY_RUN=false
HARD_RESET=false

for arg in "$@"; do
    case "$arg" in
        --force)     FORCE=true ;;
        --dry-run)   DRY_RUN=true ;;
        --hard-reset) HARD_RESET=true ;;
        --help)
            echo "Usage: $0 [--force|--dry-run|--hard-reset]"
            echo ""
            echo "  --force       Skip confirmation prompt"
            echo "  --dry-run     Show what would happen, don't actually do anything"
            echo "  --hard-reset  Hard reset local branch to target commit (no push)"
            exit 0
            ;;
    esac
done

cd "$GIT_REPO_PATH"

header "TeleMon One-Click Revert"

# ── Step 1: Fetch latest ─────────────────────────────────────────────────────

info "Fetching latest from origin..."
git fetch origin "$BRANCH" --tags 2>/dev/null || true

# ── Step 2: Find the last good commit ─────────────────────────────────────────

# Strategy: look for the most recent tag matching stable-* that is reachable
# from the current branch tip, but not the current commit itself (can't revert
# to the same commit).

info "Searching for last good commit..."

# Try stable tags first
LAST_STABLE_TAG=$(git tag -l "${STABLE_TAG_PREFIX}-*" \
    | grep -v "\-failed\-" \
    | sort -V \
    | tail -1 2>/dev/null || echo "")

if [ -n "$LAST_STABLE_TAG" ]; then
    TARGET_REF="$LAST_STABLE_TAG"
    TARGET_REASON="stable tag: $LAST_STABLE_TAG"

    # Verify this tag is an ancestor of HEAD
    if ! git merge-base --is-ancestor "$TARGET_REF" HEAD 2>/dev/null; then
        warn "Stable tag '$LAST_STABLE_TAG' is not an ancestor of HEAD — skipping"
        TARGET_REF=""
    fi
fi

# Fallback: use HEAD~1 (parent of current commit)
if [ -z "${TARGET_REF:-}" ]; then
    TARGET_REF="HEAD~1"
    TARGET_REASON="parent commit (HEAD~1)"
    info "No suitable stable tag found. Using parent commit."
fi

# Resolve to full commit hash
TARGET_COMMIT=$(git rev-parse "$TARGET_REF" 2>/dev/null || echo "")
if [ -z "$TARGET_COMMIT" ]; then
    error "Could not resolve '$TARGET_REF' to a commit"
    exit 1
fi

CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_MESSAGE=$(git log --oneline -1 HEAD)

# ── Step 3: Show comparison ──────────────────────────────────────────────────

echo ""
info "Current commit:  ${CURRENT_COMMIT:0:12} — $(git log --oneline -1 HEAD)"
info "Revert target:   ${TARGET_COMMIT:0:12} — $(git log --oneline -1 "$TARGET_COMMIT")"
info "Method:          $TARGET_REASON"
echo ""

if [ "$CURRENT_COMMIT" = "$TARGET_COMMIT" ]; then
    error "Current commit and target commit are the same! Nothing to revert."
    exit 1
fi

# Show summary of changes between current and target
echo "Changes to revert (target → current):"
git log --oneline "$TARGET_COMMIT..HEAD" 2>/dev/null | head -20
echo ""

# ── Step 4: Confirmation ──────────────────────────────────────────────────────

if [ "$DRY_RUN" = true ]; then
    header "DRY RUN — No changes made"
    info "Would revert from ${CURRENT_COMMIT:0:12} to ${TARGET_COMMIT:0:12}"
    info "Would run: git reset --hard $TARGET_COMMIT && git push origin $BRANCH --force-with-lease"
    exit 0
fi

if [ "$FORCE" = false ]; then
    read -rp "⚠️  Revert to ${TARGET_COMMIT:0:12}? This will overwrite history! [y/N] " CONFIRM
    case "$CONFIRM" in
        [yY]|[yY][eE][sS]) ;;
        *)
            info "Revert cancelled."
            exit 0
            ;;
    esac
fi

# ── Step 5: Execute revert ────────────────────────────────────────────────────

header "Executing Revert"

if [ "$HARD_RESET" = true ]; then
    # Local-only hard reset
    info "Running: git reset --hard $TARGET_COMMIT"
    git reset --hard "$TARGET_COMMIT"
    info "✅ Reverted to ${TARGET_COMMIT:0:12}"
    info "Local branch is now at: $(git log --oneline -1 HEAD)"
else
    # Full revert with force push
    info "Running: git reset --hard $TARGET_COMMIT"
    git reset --hard "$TARGET_COMMIT"

    info "Running: git push origin $BRANCH --force-with-lease"
    git push origin "$BRANCH" --force-with-lease

    # Tag the reverted state
    REVERT_TAG="revert-$(date +%Y%m%d%H%M%S)-${TARGET_COMMIT:0:8}"
    git tag -f "$REVERT_TAG" "$TARGET_COMMIT"
    git push origin "$REVERT_TAG" 2>/dev/null || true

    info ""
    info "============================================"
    info "✅ Revert complete!"
    info "   Reverted from: ${CURRENT_COMMIT:0:12}"
    info "   Reverted to:   ${TARGET_COMMIT:0:12}"
    info "   Created tag:   $REVERT_TAG"
    info "============================================"
    echo ""
    info "The old commit ${CURRENT_COMMIT:0:12} is preserved in git reflog:"
    info "  git reflog | grep ${CURRENT_COMMIT:0:12}"
fi
