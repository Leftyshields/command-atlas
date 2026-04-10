#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is required." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose plugin is required." >&2
  exit 1
fi

CODENAME="${1:-}"
if [[ -z "$CODENAME" ]]; then
  adjectives=(steady amber quiet brisk bold keen lucid silver)
  nouns=(otter falcon pine river orbit ember canyon atlas)
  a_idx=$((RANDOM % ${#adjectives[@]}))
  n_idx=$((RANDOM % ${#nouns[@]}))
  CODENAME="${adjectives[$a_idx]}-${nouns[$n_idx]}"
fi

# Keep filenames portable and easy to share.
CODENAME="$(printf "%s" "$CODENAME" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9._-' '-')"
CODENAME="${CODENAME#-}"
CODENAME="${CODENAME%-}"

if [[ -z "$CODENAME" ]]; then
  echo "Error: codename resolved to empty value." >&2
  exit 1
fi

API_CONTAINER_ID="$(docker compose ps -q api)"
if [[ -z "$API_CONTAINER_ID" ]]; then
  echo "Error: API container not found. Start services with docker compose up -d." >&2
  exit 1
fi

if ! docker compose exec -T api sh -lc "test -f /app/sqlite/dev.db" >/dev/null 2>&1; then
  echo "Error: /app/sqlite/dev.db not found in API container." >&2
  exit 1
fi

if ! docker compose exec -T api sh -lc "command -v sqlite3 >/dev/null 2>&1"; then
  echo "Error: sqlite3 is not available in the API container. Rebuild the API image: docker compose build --no-cache api" >&2
  exit 1
fi

TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"

BACKUP_FILENAME="command-atlas-${TIMESTAMP}-${CODENAME}.db"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# Consistent snapshot: SQLite .backup (not a raw file copy while writers may be active).
REMOTE_TMP="/tmp/ca-backup-${TIMESTAMP}-${CODENAME}.db"

cleanup_remote() {
  docker compose exec -T api sh -lc "rm -f '$REMOTE_TMP'" 2>/dev/null || true
}
trap cleanup_remote EXIT

docker compose exec -T api sh -lc \
  "sqlite3 /app/sqlite/dev.db \".backup '$REMOTE_TMP'\""

docker cp "${API_CONTAINER_ID}:${REMOTE_TMP}" "$BACKUP_PATH"

cleanup_remote
trap - EXIT

if command -v md5sum >/dev/null 2>&1; then
  MD5_HASH="$(md5sum "$BACKUP_PATH" | awk '{print $1}')"
elif command -v md5 >/dev/null 2>&1; then
  MD5_HASH="$(md5 -q "$BACKUP_PATH")"
else
  echo "Error: md5sum (or md5) is required to validate backup integrity." >&2
  exit 1
fi

printf "%s  %s\n" "$MD5_HASH" "$BACKUP_FILENAME" > "${BACKUP_PATH}.md5"

echo "Backup complete (SQLite .backup for consistent snapshot)."
echo "Codename: $CODENAME"
echo "Database: $BACKUP_PATH"
echo "MD5: $MD5_HASH"
echo "Checksum file: ${BACKUP_PATH}.md5"
