#!/usr/bin/env bash

echo "========================================"
echo " Sidra Video Downloader - Dev Start"
echo "========================================"
echo ""
echo "Starting all development services..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    wait 2>/dev/null
    echo "All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "[1/4] Starting Redis..."
redis-server &
REDIS_PID=$!
sleep 1

echo "[2/4] Starting Celery Worker..."
cd "$PROJECT_DIR/backend"
source venv/bin/activate
celery -A celery_worker.celery_app worker --loglevel=info &
CELERY_PID=$!
sleep 1

echo "[3/4] Starting Flask Backend..."
cd "$PROJECT_DIR/backend"
source venv/bin/activate
flask run --debug --port 5000 &
FLASK_PID=$!
sleep 1

echo "[4/4] Starting Next.js Frontend..."
cd "$PROJECT_DIR/frontend"
npm run dev &
NEXT_PID=$!

echo ""
echo "========================================"
echo " All services started!"
echo ""
echo " Frontend:  http://localhost:3000"
echo " Backend:   http://localhost:5000"
echo " Redis:     localhost:6379"
echo ""
echo " Press Ctrl+C to stop all services."
echo "========================================"
echo ""

# Wait for all background processes
wait
