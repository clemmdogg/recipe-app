#!/usr/bin/env bash
# Saves a copy of the whole database and keeps the newest ones. Run every night by cron
# (see "Backups" in README.md). Run it by hand with:  ~/recipe-app/deploy/backup.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

# Backups contain everyone's data and password hashes: only this user may read them.
umask 077
mkdir -p "$BACKUP_DIR"
cd "$(dirname "$0")"

file="$BACKUP_DIR/recipe_app-$(date +%Y-%m-%d_%H%M).dump"
# Write to a temporary name first, so a failed backup never looks like a finished one.
trap 'rm -f "$file.partial"' EXIT
# pg_dump reads a consistent snapshot while the app keeps running. The custom format is
# compressed and can be restored with pg_restore.
docker compose exec -T db pg_dump -U recipe_app -d recipe_app --format=custom > "$file.partial"
mv "$file.partial" "$file"

# Delete backups older than KEEP_DAYS days.
find "$BACKUP_DIR" -name 'recipe_app-*.dump' -mtime +"$((KEEP_DAYS - 1))" -delete

echo "$(date -Is) backup saved: $file ($(du -h "$file" | cut -f1))"
