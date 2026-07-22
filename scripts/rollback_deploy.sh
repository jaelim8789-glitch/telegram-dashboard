#!/bin/bash
# ============================================================================
# TeleMon Automatic Rollback Script
#
# Called by CI/CD when deployment smoke tests fail.  This script:
#   1. Tags the current (failed) deployment with a rollback tag
#   2. Checks out the previous stable tag or commit
#   3. Rebuilds and redeploys the known-good version
#   4. Verifies the rollback succeeded with a smoke test
#
# Usage:
#   bash scripts/rollback_deploy.sh [--target staging|production]
#
# Environment:
#   GIT_REPO_PATH    — path to the git repository (default: .)
#   STABLE_TAG_PREFIX — prefix for stable tags (default: stable)
#   MAX_ROLLBACK_ATTEMPTS — max rollback attempts (default: 3)
# ============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
TARGET="${1:-staging}"
GIT_REPO_PATH="${GIT_REPO_PATH:-.}"
STABLE_TAG_PREFIX="${STABLE_TAG_PREFIX:-stable}"
MAX_ROLLBACK_ATTEMPTS="${MAX_ROLLBACK_ATTEMPTS:-3}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Stage 1: Mark current deployment as failed ───────────────────────────────

info "=== TeleMan Deployment Rollback ==="
info "Target: $TARGET"
info ""

cd "$GIT_REPO_PATH"

CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_TAG="${STABLE_TAG_PREFIX}-failed-$(date +%Y%m%d%H%M%S)-${CURRENT_COMMIT:0:8}"

info "Tagging current (failed) commit as: $CURRENT_TAG"
git tag -f "$CURRENT_TAG" "$CURRENT_COMMIT" 2>/dev/null || true

# ── Stage 2: Find the last known-good stable tag ─────────────────────────────

info "Searching for last stable deployment tag..."
STABLE_TAGS=$(git tag -l "${STABLE_TAG_PREFIX}-*" | grep -v "\-failed\-" | sort -V 2>/dev/null || true)

if [ -z "$STABLE_TAGS" ]; then
    warn "No stable tags found. Trying last good commit on origin/master..."
    # Fetch the last known-good commit (the parent of current)
    ROLLBACK_TARGET="HEAD~1"
    ROLLBACK_REASON="parent commit (no stable tag found)"
else
    # Pick the most recent stable tag
    ROLLBACK_TARGET=$(echo "$STABLE_TAGS" | tail -1)
    ROLLBACK_REASON="stable tag: $ROLLBACK_TARGET"
fi

info "Rollback target: $ROLLBACK_TARGET ($ROLLBACK_REASON)"

# ── Stage 3: Rollback ───────────────────────────────────────────────────────

attempt=1
while [ "$attempt" -le "$MAX_ROLLBACK_ATTEMPTS" ]; do
    info ""
    info "=== Rollback attempt $attempt/$MAX_ROLLBACK_ATTEMPTS ==="

    # Reset working directory
    git fetch origin master --tags 2>/dev/null || true
    git checkout "$ROLLBACK_TARGET" 2>/dev/null || git checkout "$ROLLBACK_TARGET^{commit}" 2>/dev/null || {
        error "Cannot check out rollback target: $ROLLBACK_TARGET"
        attempt=$((attempt + 1))
        continue
    }

    ROLLBACK_COMMIT=$(git rev-parse HEAD)
    info "Rolled back to commit: $ROLLBACK_COMMIT"

    # ── Stage 4: Rebuild ────────────────────────────────────────────────

    info "Rebuilding Docker images..."

    if [ "$TARGET" = "production" ]; then
        docker compose build frontend
        docker compose up -d --no-deps frontend
    else
        docker compose -f docker-compose.yml -f docker-compose.staging.yml build frontend
        docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --no-deps frontend
    fi

    docker image prune -f || true

    # ── Stage 5: Verify rollback ─────────────────────────────────────────

    info "Verifying rollback (smoke test)..."
    SLEEP_TIME=5
    MAX_WAIT=60
    elapsed=0
    HEALTH_URL="http://localhost/health"
    [ "$TARGET" = "staging" ] && HEALTH_URL="http://localhost:8080/health"

    while [ "$elapsed" -lt "$MAX_WAIT" ]; do
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            info "✅ Rollback verified — health check passed"
            break
        fi
        sleep "$SLEEP_TIME"
        elapsed=$((elapsed + SLEEP_TIME))
    done

    if [ "$elapsed" -ge "$MAX_WAIT" ]; then
        error "❌ Rollback attempt $attempt failed — smoke test did not pass"
        attempt=$((attempt + 1))
        continue
    fi

    # ── Stage 6: Tag the rolled-back commit as the new stable ────────────
    NEW_STABLE_TAG="${STABLE_TAG_PREFIX}-$(date +%Y%m%d%H%M%S)-${ROLLBACK_COMMIT:0:8}"
    git tag -f "$NEW_STABLE_TAG" "$ROLLBACK_COMMIT"
    info "Tagged rolled-back commit as: $NEW_STABLE_TAG"

    # Push tags (allow failure — not critical)
    git push origin "$NEW_STABLE_TAG" 2>/dev/null || true
    git push origin --delete "$CURRENT_TAG" 2>/dev/null || true

    info ""
    info "============================================"
    info "✅ Rollback successful!"
    info "   Failed commit:  ${CURRENT_COMMIT:0:12}"
    info "   Rolled back to: ${ROLLBACK_COMMIT:0:12}"
    info "   New stable tag: $NEW_STABLE_TAG"
    info "============================================"

    # Notify
    if [ -n "$SLACK_WEBHOOK" ]; then
        payload="{\"text\":\"🔄 TeleMon rollback completed\\nTarget: $TARGET\\nFailed: ${CURRENT_COMMIT:0:12}\\nRolled back: ${ROLLBACK_COMMIT:0:12}\\nTag: $NEW_STABLE_TAG\"}"
        curl -s -X POST -H 'Content-type: application/json' \
            --data "$payload" "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi

    exit 0
done

# ── All attempts failed ──────────────────────────────────────────────────────

error "❌ All $MAX_ROLLBACK_ATTEMPTS rollback attempts failed"
error "Manual intervention required!"

if [ -n "$SLACK_WEBHOOK" ]; then
    payload="{\"text\":\"🚨 TeleMon rollback ALL ATTEMPTS FAILED!\\nTarget: $TARGET\\nManual intervention required!\"}"
    curl -s -X POST -H 'Content-type: application/json' \
        --data "$payload" "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
fi

exit 1
