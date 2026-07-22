#!/bin/sh
# Prepare the SQLite database and admin user, then hand off to the app.
set -e

mkdir -p "$(dirname "${DATABASE_URL#file:}")" "$THUMBNAIL_CACHE_DIR" \
  "$DOWNLOAD_VIDEO_PATH" "$DOWNLOAD_AUDIO_PATH" 2>/dev/null || true

echo "[entrypoint] Syncing database schema…"
# NOTE: --accept-data-loss is deliberately omitted. Without it, prisma will
# refuse (and fail loudly) rather than silently drop columns/tables if the
# on-disk schema ever drifts — protecting favorites, watch-later, playlists,
# playback history and downloads from being wiped on a rebuild. Additive
# schema changes still apply cleanly.
npx prisma db push --skip-generate

echo "[entrypoint] Ensuring admin account…"
node prisma/seed.mjs || echo "[entrypoint] seed skipped"

echo "[entrypoint] Starting Sidra Media on port 3000"
exec "$@"
