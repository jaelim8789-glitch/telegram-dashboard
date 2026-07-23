#!/bin/bash
# Docker image prune — run weekly on VPS via cron
# Usage: bash scripts/docker-trim.sh
set -e
echo "=== Docker Image Trim ==="
docker image prune -a -f --filter "until=168h" 2>&1
docker builder prune -a -f 2>&1 || true
echo "Done. Disk usage:"
docker system df