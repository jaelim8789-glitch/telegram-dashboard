#!/usr/bin/env bash
# TeleMon DB Backup Script
# Usage:
#   ./scripts/db-backup.sh                    # backup + cleanup old
#   ./scripts/db-backup.sh --no-cleanup       # backup only
#   ./scripts/db-backup.sh --to-s3            # backup + sync to S3/R2
#   ./scripts/db-backup.sh --restore FILE.sql.gz  # restore from backup
#
# Recommended cron: daily at 03:00
#   0 3 * * * /opt/telemon/backend/scripts/db-backup.sh --to-s3 >> /var/log/telemon-backup.log 2>&1

set -euo pipefail

# ─── Config (override via env) ────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/backups/telemon/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-telemon_prod}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
COMPRESS_CMD="${COMPRESS_CMD:-gzip}"
COMPRESS_EXT="${COMPRESS_EXT:-.gz}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

# S3/R2 config (optional — set to sync to object storage)
S3_ENDPOINT="${S3_ENDPOINT:-}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-telemon-db-backup}"
S3_REGION="${S3_REGION:-auto}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2; }
notify() {
  local level="$1" msg="$2"
  log "[$level] $msg"
  if [ -n "$ALERT_WEBHOOK" ]; then
    curl -s -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"[$level] TeleMon DB Backup: $msg\"}" \
      -o /dev/null -w " (webhook: %{http_code})" 2>/dev/null && echo || true
  fi
}

# ─── Dependencies check ───────────────────────────────────────────────────
check_deps() {
  local missing=()
  command -v psql >/dev/null 2>&1 || missing+=("psql")
  command -v pg_dump >/dev/null 2>&1 || missing+=("pg_dump")
  if [ ${#missing[@]} -gt 0 ]; then
    # Try docker exec fallback
    if command -v docker >/dev/null 2>&1; then
      log "pg_dump not found locally — will use docker exec telemon_db_prod"
      USE_DOCKER=true
    else
      err "Missing: ${missing[*]} and no docker available"
      exit 1
    fi
  fi
}

# ─── Backup ────────────────────────────────────────────────────────────────
do_backup() {
  mkdir -p "$BACKUP_DIR"

  local timestamp
  timestamp=$(date '+%Y%m%d_%H%M%S')
  local filename="telemon_db_${timestamp}.sql"
  local filepath="${BACKUP_DIR}/${filename}"
  local compressed="${filepath}${COMPRESS_EXT}"

  log "Starting backup: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

  if [ "${USE_DOCKER:-false}" = true ]; then
    # via docker exec (PostgreSQL container)
    local db_container
    db_container=$(docker ps --format '{{.Names}}' | grep -E 'telemon.*db|postgres' | head -1)
    if [ -z "$db_container" ]; then
      err "No PostgreSQL container found"
      exit 1
    fi
    log "Using docker container: $db_container"
    PGPASSWORD="$DB_PASSWORD" docker exec -i "$db_container" \
      pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$filepath"
  else
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" \
      -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$filepath"
  fi

  local dump_size
  dump_size=$(wc -c < "$filepath")
  log "Raw dump: $(numfmt --to=iec "$dump_size" 2>/dev/null || echo "$dump_size bytes")"

  $COMPRESS_CMD "$filepath"
  local compressed_size
  compressed_size=$(wc -c < "$compressed")
  log "Compressed: $(numfmt --to=iec "$compressed_size" 2>/dev/null || echo "$compressed_size bytes")"

  # Checksum
  sha256sum "$compressed" > "${compressed}.sha256"

  log "Backup saved: $compressed"
  notify "INFO" "Backup complete: ${filename}${COMPRESS_EXT} ($(numfmt --to=iec "$compressed_size"))"
}

# ─── Cleanup old backups ───────────────────────────────────────────────────
do_cleanup() {
  log "Cleaning backups older than ${RETENTION_DAYS} days..."
  local count=0
  while IFS= read -r -d '' f; do
    rm -f "$f" "${f}.sha256" 2>/dev/null
    count=$((count + 1))
  done < <(find "$BACKUP_DIR" -name "telemon_db_*.sql${COMPRESS_EXT}" -mtime "+${RETENTION_DAYS}" -print0)
  log "Removed ${count} old backup(s)"
}

# ─── Restore ────────────────────────────────────────────────────────────────
do_restore() {
  local restore_file="$1"
  if [ ! -f "$restore_file" ]; then
    err "Restore file not found: $restore_file"
    exit 1
  fi

  log "RESTORING from: $restore_file (IRREVERSIBLE!)"
  log "Waiting 5s — Ctrl+C to abort..."
  sleep 5

  if [[ "$restore_file" == *.gz ]]; then
    zcat "$restore_file" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"
  else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$restore_file"
  fi
  log "Restore complete"
  notify "WARN" "Database restored from: $restore_file"
}

# ─── Sync to S3/R2 ─────────────────────────────────────────────────────────
do_sync_s3() {
  if [ -z "$S3_ENDPOINT" ] || [ -z "$S3_BUCKET" ]; then
    log "S3 not configured — skipping sync"
    return
  fi

  log "Syncing to S3-compatible storage: ${S3_ENDPOINT}/${S3_BUCKET}/${S3_PREFIX}"

  local s3_cmd="aws s3"
  if command -v aws >/dev/null 2>&1; then
    AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="$S3_REGION" \
    aws s3 sync "$BACKUP_DIR/" "s3://${S3_BUCKET}/${S3_PREFIX}/" \
      --endpoint-url "$S3_ENDPOINT" \
      --no-progress
  else
    log "aws-cli not found, trying rclone..."
    if command -v rclone >/dev/null 2>&1; then
      rclone copy "$BACKUP_DIR/" ":s3,access_key_id=${AWS_ACCESS_KEY_ID},secret_access_key=${AWS_SECRET_ACCESS_KEY},region=${S3_REGION},endpoint=${S3_ENDPOINT}:${S3_BUCKET}/${S3_PREFIX}" \
        --verbose --progress
    else
      err "Neither aws nor rclone found — install one for S3 sync"
      return 1
    fi
  fi

  log "S3 sync complete"
  notify "INFO" "Backup synced to S3: ${S3_ENDPOINT}/${S3_BUCKET}/${S3_PREFIX}"
}

# ─── Main ──────────────────────────────────────────────────────────────────
main() {
  local mode="${1:-}"
  check_deps

  case "$mode" in
    --restore)
      shift
      do_restore "${1:-}"
      ;;
    --no-cleanup)
      do_backup
      ;;
    --to-s3)
      do_backup
      do_sync_s3 || true
      do_cleanup
      ;;
    --s3-only)
      do_sync_s3
      ;;
    --cleanup)
      do_cleanup
      ;;
    *)
      do_backup
      do_cleanup
      ;;
  esac
}

main "$@"
