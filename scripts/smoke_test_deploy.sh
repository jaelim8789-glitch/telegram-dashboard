#!/bin/bash
# ============================================================================
# TeleMon Deployment Smoke Test
#
# Runs immediate post-deploy health checks against core pages and API endpoints:
#   - Landing page (/)
#   - App dashboard (/app, /app/dashboard)
#   - Health check endpoints (/health, /api/health, /)
#   - Pricing / Plans API (/api/billing/plans or /pricing)
#   - Admin login page (/admin/login)
#
# Usage:
#   export FRONTEND_URL="https://telemon.online"
#   export BACKEND_URL="https://api.telemon.online"
#   bash scripts/smoke_test_deploy.sh
#
# Returns 0 if all checks pass, 1 if any check fails.
# ============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
TIMEOUT_SEC="${TIMEOUT_SEC:-15}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

PASS=0
FAIL=0
FAILURES=()

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── Helpers ──────────────────────────────────────────────────────────────────

info()   { echo -e "  ${YELLOW}[INFO]${NC} $1"; }
pass()   { echo -e "  ${GREEN}[PASS]${NC} $1"; ((PASS++)); }
fail()   { echo -e "  ${RED}[FAIL]${NC} $1"; FAILURES+=("$1"); ((FAIL++)); }

check_http() {
    local label="$1" url="$2" expected_status="${3:-200}" expected_text="${4:-}"

    local status_code
    status_code=$(curl -s -o /tmp/_smoke_response.txt -w "%{http_code}" \
        --max-time "$TIMEOUT_SEC" -L "$url" 2>/dev/null || echo "000")

    if [ "$status_code" = "000" ]; then
        fail "$label — connection failed (timeout or DNS error)"
        return 1
    fi

    if [ "$status_code" -ne "$expected_status" ]; then
        fail "$label — expected HTTP $expected_status, got $status_code (url: $url)"
        return 1
    fi

    if [ -n "$expected_text" ]; then
        if ! grep -q "$expected_text" /tmp/_smoke_response.txt 2>/dev/null; then
            fail "$label — HTTP $status_code OK, but missing expected text: '$expected_text'"
            return 1
        fi
    fi

    pass "$label — HTTP $status_code (url: $url)"
    return 0
}

check_json_key() {
    local label="$1" url="$2" expected_key="$3"

    local status_code
    status_code=$(curl -s -o /tmp/_smoke_json.txt -w "%{http_code}" \
        --max-time "$TIMEOUT_SEC" "$url" 2>/dev/null || echo "000")

    if [ "$status_code" = "000" ]; then
        fail "$label — connection failed"
        return 1
    fi

    if ! python3 -c "
import json, sys
try:
    data = json.load(open('/tmp/_smoke_json.txt'))
    if '$expected_key' in data:
        sys.exit(0)
    else:
        print(f'Missing key: $expected_key. Keys: {list(data.keys())}')
        sys.exit(1)
except Exception as e:
    print(f'JSON parse error: {e}')
    sys.exit(1)
" 2>/dev/null; then
        fail "$label — missing expected JSON key '$expected_key'"
        return 1
    fi

    pass "$label — JSON key '$expected_key' found (url: $url)"
    return 0
}

# ============================================================================
# Main
# ============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TeleMon Deployment Smoke Test"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
echo "  Time:     $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── 1. Frontend Pages ────────────────────────────────────────────────────────

echo "── [1/6] Frontend Pages ──"

check_http "Landing page"        "$FRONTEND_URL/"            200 "TeleMon"
check_http "App dashboard"       "$FRONTEND_URL/app"         200
check_http "App dashboard home"  "$FRONTEND_URL/app/dashboard" 200
check_http "Pricing page"        "$FRONTEND_URL/pricing"     200
check_http "Signup page"         "$FRONTEND_URL/signup"      200
check_http "Get API Key page"    "$FRONTEND_URL/get-api-key" 200
check_http "Features page"       "$FRONTEND_URL/features"    200
check_http "Admin login page"    "$FRONTEND_URL/admin/login" 200

# Unauthenticated should 403 on protected routes
check_http "Admin dashboard (no auth)" "$FRONTEND_URL/admin/dashboard" 403
check_http "App (no auth)"             "$FRONTEND_URL/app"             200  # may redirect

echo ""

# ── 2. Backend Health ─────────────────────────────────────────────────────────

echo "── [2/6] Backend Health ──"

# Try different health endpoints
check_json_key "Root health endpoint"    "$BACKEND_URL/"             "status"
check_json_key "Health API endpoint"     "$BACKEND_URL/health"       "status"
check_json_key "API health endpoint"     "$BACKEND_URL/api/health"   "status"

echo ""

# ── 3. Backend Metrics ────────────────────────────────────────────────────────

echo "── [3/6] Backend Metrics ──"

check_http "Prometheus metrics" "$BACKEND_URL/metrics" 200

echo ""

# ── 4. Pricing / Plans API ────────────────────────────────────────────────────

echo "── [4/6] Pricing / Plans API ──"

# Try common pricing/plan endpoints
check_http "Billing plans API" "$BACKEND_URL/api/billing/plans" 200 2>/dev/null || true
check_http "Pricing API"       "$BACKEND_URL/api/pricing"       200 2>/dev/null || true
check_http "Plans API"         "$BACKEND_URL/api/plans"         200 2>/dev/null || true
check_http "Features API"      "$BACKEND_URL/api/features"      200 2>/dev/null || true

echo ""

# ── 5. Backend API Auth Gate ─────────────────────────────────────────────────

echo "── [5/6] Backend Auth Gate ──"

# Protected endpoints should return 401/403 without auth
check_http "Accounts API (no auth)"    "$BACKEND_URL/api/accounts"    401 2>/dev/null || \
    check_http "Accounts API (no auth)" "$BACKEND_URL/api/accounts"   403 2>/dev/null || \
    info "Accounts API: auth gate check skipped (endpoint may be open)"

check_http "Admin dashboard (no auth)" "$BACKEND_URL/api/admin/dashboard" 401 2>/dev/null || \
    check_http "Admin dashboard (no auth)" "$BACKEND_URL/api/admin/dashboard" 403 2>/dev/null || \
    info "Admin dashboard: auth gate check skipped"

echo ""

# ── 6. Database Check ────────────────────────────────────────────────────────

echo "── [6/6] Database Check ──"

if command -v python3 &>/dev/null; then
    for db_path in "data/runtime.db" "data/admin.db"; do
        if [ -f "$db_path" ]; then
            python3 -c "
import sqlite3, sys
try:
    conn = sqlite3.connect('$db_path', timeout=5)
    tables = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()
    print(f'  [PASS] $db_path — {len(tables)} tables: {[t[0] for t in tables]}')
    conn.close()
except Exception as e:
    print(f'  [FAIL] $db_path — {e}')
    sys.exit(1)
" 2>/dev/null && ((PASS++)) || ((FAIL++))
        else
            info "$db_path — not found (will be created on first run)"
        fi
    done
else
    info "python3 not found — skipping database check"
fi

echo ""

# ── Summary ───────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} out of $((PASS + FAIL)) checks"
if [ ${#FAILURES[@]} -gt 0 ]; then
    echo "  Failures:"
    for f in "${FAILURES[@]}"; do
        echo -e "    ${RED}•${NC} $f"
    done
fi
echo "═══════════════════════════════════════════════════════════════"

# ── Slack notification ────────────────────────────────────────────────────────

if [ -n "$SLACK_WEBHOOK" ] && [ "$FAIL" -gt 0 ]; then
    SUMMARY=$(printf '\\n• %s' "${FAILURES[@]}")
    payload="{\"text\":\"⚠️ TeleMon Smoke Test — $FAIL failure(s)\\n$SUMMARY\"}"
    curl -s -X POST -H 'Content-type: application/json' \
        --data "$payload" "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
fi

rm -f /tmp/_smoke_response.txt /tmp/_smoke_json.txt

if [ "$FAIL" -gt 0 ]; then
    exit 1
else
    exit 0
fi
