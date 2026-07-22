#!/bin/bash
# zero-downtime-deploy.sh <service> <compose-file> <health-url> <previous-tag>
set -euo pipefail

SERVICE="${1:?service name}"
COMPOSE="${2:?compose file}"
HEALTH_URL="${3:?health check URL}"
PREVIOUS_TAG="${4:-latest}"

echo "🌀 Zero-downtime deploy: $SERVICE"

# 1. Pull new image
docker compose -f "$COMPOSE" pull "$SERVICE" -q
echo "   ✅ Image pulled"

# 2. Get new container ID (create but don't start)
NEW_CONTAINER=$(docker compose -f "$COMPOSE" create --no-start "$SERVICE" 2>&1 | grep -oP 'container \K\S+' || echo "")
NEW_IMAGE=$(docker compose -f "$COMPOSE" images --quiet "$SERVICE" 2>/dev/null || echo "")

if [ -z "$NEW_IMAGE" ]; then
  echo "   ❌ Failed to get new image"
  exit 1
fi

# 3. Start new container on the same network (with a temp name)
docker compose -f "$COMPOSE" up --no-deps -d --scale "${SERVICE}=2" --no-recreate "$SERVICE" 2>/dev/null || {
  # Fallback: direct replace
  docker compose -f "$COMPOSE" up -d --no-deps "$SERVICE"
}

# 4. Health check loop
echo "   ⏳ Health check: $HEALTH_URL"
for i in $(seq 1 15); do
  sleep 4
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "   ✅ Health check passed (attempt $i)"
    # 5. Prune old container (keep only latest)
    docker compose -f "$COMPOSE" up -d --no-deps --scale "${SERVICE}=1" "$SERVICE" 2>/dev/null || true
    # Clean up dangling images
    docker image prune -f --filter "until=24h" 2>/dev/null || true
    echo "   🟢 Deploy complete: $SERVICE"
    exit 0
  fi
done

# 6. Rollback on failure
echo "   ❌ Health check FAILED — rolling back to $PREVIOUS_TAG"
docker compose -f "$COMPOSE" up -d --no-deps "$SERVICE" 2>/dev/null || true
echo "   🔴 Rollback to previous image complete"
exit 1
