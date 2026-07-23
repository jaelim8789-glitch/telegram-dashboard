#!/usr/bin/env bash
# deploy-watchtower.sh — Set up Watchtower on VPS for automatic container updates
# Usage: bash scripts/deploy-watchtower.sh
# Run this ONCE on the VPS to enable automatic GHCR image pulls.
set -euo pipefail

VPS_HOST="${1:-root@130.94.32.152}"

echo "==> [deploy-watchtower] Deploying to $VPS_HOST..."
echo ""

ssh "$VPS_HOST" bash -s << "REMOTE"
  set -euo pipefail

  # Stop existing watchtower if running
  docker stop watchtower 2>/dev/null || true
  docker rm watchtower 2>/dev/null || true

  echo "==> Starting Watchtower (poll every 30s, cleanup old images)..."
  docker run -d \
    --name watchtower \
    --restart unless-stopped \
    -v /var/run/docker.sock:/var/run/docker.sock \
    containrrr/watchtower:latest \
    --interval 30 \
    --cleanup \
    --include-stopped \
    --revive-stopped

  echo ""
  echo "  ✅ Watchtower running. Checking logs..."
  sleep 2
  docker logs --tail 5 watchtower

  echo ""
  echo "  Watchtower will now automatically:"
  echo "  - Poll GHCR every 30s for new images"
  echo "  - Pull and restart updated containers"
  echo "  - Clean up old image layers"
  echo ""
  echo "  Manual trigger: docker exec watchtower watchtower --run-once"
REMOTE

echo "==> [deploy-watchtower] Complete"
