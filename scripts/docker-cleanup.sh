#!/bin/sh
# Weekly Docker cleanup — run via cron on VPS
# Installed by provision-vps.sh at /etc/cron.weekly/docker-cleanup
# Avoids running `docker image prune -f` during every deploy

set -e

echo "[$(date)] Docker cleanup start..."
docker image prune -f --filter "until=24h" 2>&1 || true
docker builder prune -f 2>&1 || true
echo "[$(date)] Docker cleanup complete."
