# ── Sidra Media — single-image, single-service build ────────────────
# Node + yt-dlp + ffmpeg, a Next.js full-stack app, SQLite. That's it.
FROM node:20-bookworm-slim

# System deps: ffmpeg/ffprobe for transcoding & thumbnails, python3 &
# yt-dlp for downloading, tini as a proper init for clean signal handling.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
      ffmpeg python3 ca-certificates curl tini \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
# Next telemetry off in containers
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies. The postinstall hook runs `prisma generate`, so the
# schema must be present before `npm ci`. devDependencies must be included
# despite NODE_ENV=production — `next build` needs tailwind/typescript.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

# Build the app.
COPY . .
RUN npm run build

# Strip CR characters in case the file was checked out with CRLF endings
# on Windows — a `#!/bin/sh\r` shebang makes exec fail with ENOENT.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

# Sensible in-container defaults (override via compose / env).
ENV DATABASE_URL="file:/data/app.db" \
    THUMBNAIL_CACHE_DIR="/data/thumbnails" \
    DOWNLOAD_VIDEO_PATH="/downloads/videos" \
    DOWNLOAD_AUDIO_PATH="/downloads/audio" \
    MEDIA_VIDEO_PATH="/media/videos" \
    MEDIA_AUDIO_PATH="/media/music"

ENTRYPOINT ["/usr/bin/tini", "--", "docker-entrypoint.sh"]
CMD ["npm", "start"]
