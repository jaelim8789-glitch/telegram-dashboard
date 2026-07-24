#!/bin/bash
# db-backup: DB 덤프 저장

BACKUP_DIR="/tmp/telemon-db-backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date '+%Y%m%d-%H%M')

echo "📦 Backing up old VPS DB..."
ssh root@130.94.32.152 \
  "docker exec \$(docker ps --filter name=db -q) pg_dump -U telemon telemon" \
  > "$BACKUP_DIR/old-vps-$DATE.sql"

echo "✅ Saved to $BACKUP_DIR/old-vps-$DATE.sql ($(wc -c < "$BACKUP_DIR/old-vps-$DATE.sql") bytes)"
