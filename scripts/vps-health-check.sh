#!/usr/bin/env bash
# vps-health-check.sh ??VPS ë¦¬ì†Œ??CPU/ë©”ëª¨ë¦??”ìŠ¤?? ?„ê³„ì¹??Œë¦¼
#
# Usage:
#   ./scripts/vps-health-check.sh                  # single check, exit 1 if threshold exceeded
#   ./scripts/vps-health-check.sh --daemon          # run every 60s in background
#   ./scripts/vps-health-check.sh --webhook URL     # Slack/Discord webhook on alert
#
# Thresholds (override via env):
#   VPS_CPU_THRESHOLD=90      # CPU % (default: 90)
#   VPS_MEM_THRESHOLD=90      # Memory % (default: 90)
#   VPS_DISK_THRESHOLD=85     # Disk % (default: 85)
#   VPS_LOAD_THRESHOLD=5.0    # Load average per core (default: 5.0)

set -euo pipefail

CPU_THRESHOLD="${VPS_CPU_THRESHOLD:-90}"
MEM_THRESHOLD="${VPS_MEM_THRESHOLD:-90}"
DISK_THRESHOLD="${VPS_DISK_THRESHOLD:-85}"
LOAD_THRESHOLD="${VPS_LOAD_THRESHOLD:-5.0}"
WEBHOOK_URL="${VPS_WEBHOOK_URL:-}"
MODE="${1:-}"

ALERTS=()

check_cpu() {
  local usage
  usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'.' -f1)
  if [ -z "$usage" ]; then
    # Alpine/musl fallback
    usage=$(grep -oP '^\d+' /proc/loadavg | head -1)
  fi
  if [ "${usage:-0}" -gt "$CPU_THRESHOLD" ] 2>/dev/null; then
    ALERTS+=("CPU: ${usage}% (threshold: ${CPU_THRESHOLD}%)")
  fi
}

check_memory() {
  if command -v free >/dev/null 2>&1; then
    local total used pct
    total=$(free -m | awk '/^Mem:/{print $2}')
    used=$(free -m | awk '/^Mem:/{print $3}')
    pct=$(( used * 100 / total ))
    if [ "$pct" -gt "$MEM_THRESHOLD" ]; then
      ALERTS+=("Memory: ${pct}% used (${used}MB/${total}MB, threshold: ${MEM_THRESHOLD}%)")
    fi
  fi
}

check_disk() {
  local pct
  pct=$(df / | awk 'NR==2{print $5}' | tr -d '%')
  if [ "${pct:-0}" -gt "$DISK_THRESHOLD" ]; then
    ALERTS+=("Disk: ${pct}% (threshold: ${DISK_THRESHOLD}%)")
  fi
}

check_load() {
  local cores load
  cores=$(nproc 2>/dev/null || echo 1)
  load=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | tr -d ' ')
  if [ "$(echo "$load > $LOAD_THRESHOLD" | bc 2>/dev/null || echo 0)" = "1" ]; then
    ALERTS+=("Load average: ${load} (${cores} cores, threshold: ${LOAD_THRESHOLD})")
  fi
}

send_alert() {
  local message="$1"
  echo "?”´ $message"
  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"?š¨ TeleMon VPS Alert: $message\"}" \
      -o /dev/null -w " (webhook: %{http_code})" && echo
  fi
}

run_checks() {
  ALERTS=()
  check_cpu
  check_memory
  check_disk
  check_load

  if [ ${#ALERTS[@]} -eq 0 ]; then
    echo "??All resources healthy"
    return 0
  fi

  for alert in "${ALERTS[@]}"; do
    send_alert "$alert"
  done
  return 1
}

case "$MODE" in
  --daemon)
    echo "VPS Health Check Daemon ??every 60s"
    while true; do
      run_checks
      sleep 60
    done
    ;;
  --webhook)
    WEBHOOK_URL="$2"
    run_checks
    ;;
  *)
    run_checks
    ;;
esac
