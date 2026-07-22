#!/usr/bin/env bash
# sentry-error-dashboard.sh ??Sentry APIÎ°??§ÏãúÍ∞??êÎü¨??Ï°∞Ìöå
#
# Prerequisites:
#   export SENTRY_AUTH_TOKEN="your_sentry_auth_token"   # Settings ??Developer ??Create Internal Integration
#   export SENTRY_ORG="telemon"
#   export SENTRY_PROJECT="telemon-nextjs"
#
# Usage:
#   ./scripts/sentry-error-dashboard.sh                # ?§Îäò ?êÎü¨ ?îÏïΩ
#   ./scripts/sentry-error-dashboard.sh --watch        # 30Ï¥àÎßà??Í∞±Ïã†
#   ./scripts/sentry-error-dashboard.sh --alert 50     # ?êÎü¨ 50Í±?Ï¥àÍ≥º ??exit 1
#   ./scripts/sentry-error-dashboard.sh --deploy-check # Î∞∞Ìè¨ ???àÏ†Ñ???ïÏù∏

set -euo pipefail

SENTRY_ORG="${SENTRY_ORG:-telemon}"
SENTRY_PROJECT="${SENTRY_PROJECT:-telemon-nextjs}"
SENTRY_TOKEN="${SENTRY_AUTH_TOKEN:-}"
MODE="${1:-}"
THRESHOLD="${2:-}"

if [ -z "$SENTRY_TOKEN" ]; then
  echo "??SENTRY_AUTH_TOKEN not set"
  echo "   Create at: https://sentry.io/settings/account/api/tokens/"
  echo "   Needs: project:read, org:read"
  exit 1
fi

SENTRY_API="https://sentry.io/api/0"

fetch() {
  local endpoint="$1"
  curl -s -H "Authorization: Bearer $SENTRY_TOKEN" "$SENTRY_API$endpoint"
}

print_section() {
  echo ""
  echo "?Å‚îÅ??$1 ?Å‚îÅ??
}

fetch_stats() {
  local period="${1:-24h}"
  print_section "Error Stats (last $period)"
  fetch "/projects/$SENTRY_ORG/$SENTRY_PROJECT/stats/?stat=received&since=$(date -d '-24 hours' +%s 2>/dev/null || echo '86400')" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
total = sum(h[1] for h in data) if isinstance(data, list) else 0
print(f'  Total errors: {int(total)}')
"
}

fetch_issues() {
  local query="${1:-is:unresolved}"
  local limit="${2:-5}"
  print_section "Top $limit Unresolved Issues"
  fetch "/projects/$SENTRY_ORG/$SENTRY_PROJECT/issues/?query=$query&limit=$limit&sort=-freq" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
for i, issue in enumerate(data[:$limit], 1):
    count = issue.get('count', 0)
    title = issue.get('title', '???')
    level = issue.get('level', 'error').upper()
    print(f'  {i}. [{level}] {title} (√ó{count})')
    print(f'     https://sentry.io/organizations/$SENTRY_ORG/issues/{issue.get(\"id\", \"?\")}/')
"
}

fetch_releases() {
  print_section "Recent Releases"
  fetch "/organizations/$SENTRY_ORG/releases/?per_page=5&project=$(
    fetch "/projects/$SENTRY_ORG/$SENTRY_PROJECT/" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
  )" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for rel in data:
    ver = rel.get('version', '???')
    date = rel.get('dateCreated', '???')[:19]
    commits = rel.get('commitCount', 0)
    print(f'  {ver}  ({date})  {commits} commits')
"
}

check_threshold() {
  local alert_count="${1:-0}"
  if [ "$alert_count" -gt "${THRESHOLD:-999999}" ] 2>/dev/null; then
    echo "?î¥ ERROR THRESHOLD EXCEEDED: $alert_count > $THRESHOLD"
    return 1
  fi
  return 0
}

case "$MODE" in
  --watch)
    echo "Sentry Error Dashboard ??updating every 30s"
    while true; do
      clear 2>/dev/null || true
      date '+%Y-%m-%d %H:%M:%S'
      local total
      total=$(fetch_stats "24h" | grep "Total errors" | grep -oP '\d+')
      fetch_issues "is:unresolved" 5
      sleep 30
    done
    ;;
  --alert)
    total=$(fetch_stats "1h" | grep "Total errors" | grep -oP '\d+')
    check_threshold "${total:-0}"
    ;;
  --deploy-check)
    echo "?îç Deploy Safety Check"
    total=$(fetch_stats "1h" | grep "Total errors" | grep -oP '\d+')
    echo "  Last hour errors: ${total:-0}"
    fetch_issues "is:unresolved error" 3
    if [ "${total:-0}" -gt 0 ]; then
      echo "?†Ô∏è  Recent errors found ??review before deploying"
    else
      echo "??No recent errors ??safe to deploy"
    fi
    ;;
  *)
    date '+?ìä %Y-%m-%d %H:%M:%S'
    fetch_stats "24h"
    fetch_issues "is:unresolved" 5
    fetch_releases
    echo ""
    ;;
esac
