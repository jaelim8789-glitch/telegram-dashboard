#!/bin/bash
# docker-event-monitor.sh — VPS Docker 컨테이너 비정상 종료 감지 + 알림
set -euo pipefail

WEBHOOK="${DOCKER_EVENT_WEBHOOK:-}"
RETRIES=3
SLEEP=2

notify() {
  local payload
  payload=$(cat <<EOF
{"text":"🚨 TeleMon Docker event\n$1","username":"TeleMon Ops","icon_emoji":":rotating_light:"}
EOF
)
  if [ -n "$WEBHOOK" ]; then
    curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$WEBHOOK" >/dev/null 2>&1 || true
  fi
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1"
}

echo "🔍 docker-event-monitor started — watching die/kill/oom/restart events"

docker events --filter event=die --filter event=kill --filter event=oom --filter event=restart --format '{{json .}}' | while read -r line; do
  action=$(echo "$line" | grep -o '"Action":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  name=$(echo "$line" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  id=$(echo "$line" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

  case "$action" in
    die|kill|oom)
      notify "Container $name ($id) $action — checking restart policy"
      sleep 1
      state=$(docker inspect --format='{{.State.Status}}' "$id" 2>/dev/null || echo "unknown")
      if [ "$state" != "running" ]; then
        notify "Container $name ($id) not recovered — manual intervention required"
      fi
      ;;
    restart)
      notify "Container $name ($id) restarted automatically"
      ;;
  esac
done
