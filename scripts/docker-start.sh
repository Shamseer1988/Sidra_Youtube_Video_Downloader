#!/usr/bin/env bash
set -e

echo "========================================"
echo " Sidra Video Downloader - Docker Launcher"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

# Check if root .env exists, if not copy it
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "[1/3] Creating .env from .env.example..."
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo "Please customize database password or secrets in the root .env file if needed."
else
    echo "[1/3] Root .env file already exists."
fi
echo ""

# Prompt for Mode Selection
echo "Select your local Docker deployment mode:"
echo "  [1] Production Mode (Recommended - Runs behind Nginx on port 8080)"
echo "  [2] Development Mode (Runs Next.js on port 3000 and Flask on 5000 with Hot Reload)"
echo ""
read -p "Choose option (1 or 2, default is 1): " MODE
MODE=${MODE:-1}

echo ""
echo "[2/3] Building and starting Docker containers..."
if [ "$MODE" = "2" ]; then
    echo "Starting in DEVELOPMENT mode..."
    docker compose -f "$PROJECT_DIR/docker-compose.yml" -f "$PROJECT_DIR/docker-compose.dev.yml" up -d --build
else
    echo "Starting in PRODUCTION mode..."
    docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d --build
fi

echo ""
echo "[3/3] Running database migrations & credentials registration..."
echo "Waiting 10 seconds for database service to initialize..."
sleep 10

echo "Running flask db upgrade..."
docker compose exec backend flask db upgrade

echo "Running create_admin.py..."
docker compose exec backend python create_admin.py

echo ""
echo "========================================"
echo " Sidra Video Downloader is ready!"
echo ""
if [ "$MODE" = "2" ]; then
    echo " Development Mode active:"
    echo "  - Next.js Frontend: http://localhost:3000"
    echo "  - Flask API Backend: http://localhost:5000"
else
    echo " Production Mode active:"
    echo "  - Web UI Portal:     http://localhost:8080"
fi
echo " Default Login:"
echo "  - Username: admin"
echo "  - Password: admin123 (or what you set in .env)"
echo "========================================"
echo ""
