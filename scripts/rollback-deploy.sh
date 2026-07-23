#!/bin/bash
# rollback-deploy.sh <compose-file> <service>
# Pulls the previously-working image tag and restarts
set -euo pipefail

COMPOSE="${1:?compose file}"
SERVICE="${2:?service name}"

echo "🔴 Rollback: $SERVICE"

# Get the second-to-last image digest from docker history
CURRENT=$(docker inspect --format '{{.Image}}' "$(docker compose -f "$COMPOSE" ps --quiet "$SERVICE" 2>/dev/null)" 2>/dev/null || echo "")

if [ -n "$CURRENT" ]; then
  # Tag current as :previous-rollback
  docker tag "$CURRENT" "${REGISTRY}/${SERVICE}:rollback-$(date +%s)" 2>/dev/null || true
fi

# Pull the previous tag (staging or the SHA-tagged image before current)
# Strategy: use docker compose down + up with the previous compose image
docker compose -f "$COMPOSE" up -d --no-deps --force-recreate "$SERVICE" 2>/dev/null || {
  echo "   ⚠️ Compose up failed, trying direct docker run..."
  PREV_IMAGE=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep "$SERVICE" | grep -v "latest\|staging" | head -1)
  if [ -n "$PREV_IMAGE" ]; then
    docker tag "$PREV_IMAGE" "${SERVICE}:latest" 2>/dev/null || true
    docker compose -f "$COMPOSE" up -d --no-deps "$SERVICE"
  fi
}

echo "   ✅ Rollback attempted — verify with health check"
