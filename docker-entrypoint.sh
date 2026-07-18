#!/bin/sh
# Prepare the SQLite database and admin user, then hand off to the app.
set -e

mkdir -p "$(dirname "${DATABASE_URL#file:}")" "$THUMBNAIL_CACHE_DIR" \
  "$DOWNLOAD_VIDEO_PATH" "$DOWNLOAD_AUDIO_PATH" 2>/dev/null || true

echo "[entrypoint] Syncing database schema…"
npx prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] Ensuring admin account…"
node prisma/seed.mjs || echo "[entrypoint] seed skipped"

echo "[entrypoint] Starting Sidra Media on port 3000"
exec "$@"
