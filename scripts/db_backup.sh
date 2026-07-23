#!/bin/bash
set -euo pipefail

# ============================================================
# TeleMon PostgreSQL Daily Backup
# Schedule: daily via cron (see crontab example below)
# Retention: 7 days
#
# Install on VPS:
#   sudo cp scripts/db_backup.sh /usr/local/bin/telemon-db-backup
#   sudo chmod +x /usr/local/bin/telemon-db-backup
#   sudo crontab -e
#   # Add: 0 3 * * * /usr/local/bin/telemon-db-backup
#
# Restore:
#   gunzip -c /backups/telemon/db_20260722_030001.sql.gz | docker exec -i telemon-db-1 psql -U telegram_dashboard
# ============================================================

BACKUP_DIR="${BACKUP_DIR:-/backups/telemon}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_CONTAINER="${DB_CONTAINER:-telegram-dashboard-backend-db-1}"
DB_USER="${DB_USER:-telegram_dashboard}"
DB_NAME="${DB_NAME:-telegram_dashboard}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL backup..."

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "db_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned up backups older than ${RETENTION_DAYS} days"

# Keep a latest symlink for easy reference
ln -sf "$BACKUP_FILE" "${BACKUP_DIR}/latest.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete."
