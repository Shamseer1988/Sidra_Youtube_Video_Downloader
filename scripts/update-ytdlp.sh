#!/usr/bin/env bash
set -e

echo "========================================"
echo " Sidra Video Downloader - Update yt-dlp"
echo "========================================"
echo ""
echo "Updating yt-dlp in Docker containers..."
echo ""

echo "[1/3] Updating yt-dlp in backend container..."
docker compose exec backend pip install --upgrade yt-dlp

echo ""
echo "[2/3] Updating yt-dlp in worker container..."
docker compose exec worker pip install --upgrade yt-dlp

echo ""
echo "[3/3] Restarting backend and worker services..."
docker compose restart backend worker

echo ""
echo "========================================"
echo " yt-dlp updated and services restarted!"
echo "========================================"
echo ""

# Show new version
echo "New yt-dlp version:"
docker compose exec backend yt-dlp --version
