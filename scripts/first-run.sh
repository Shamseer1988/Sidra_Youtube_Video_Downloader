#!/usr/bin/env bash
set -e

echo "========================================"
echo " Sidra Video Downloader - First Run Setup"
echo "========================================"
echo ""
echo "This script will set up everything you need to run Sidra Video Downloader."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

echo "[1/6] Setting up Python virtual environment..."
echo "------------------------------------------------"
cd "$PROJECT_DIR/backend"
python3 -m venv venv
source venv/bin/activate
echo "      Virtual environment created and activated."
echo ""

echo "[2/6] Installing Python dependencies..."
echo "------------------------------------------------"
pip install -r requirements.txt
echo "      Python dependencies installed."
echo ""

echo "[3/6] Setting up database..."
echo "------------------------------------------------"
bash "$SCRIPT_DIR/setup-db.sh"
echo ""

echo "[4/6] Running database migrations..."
echo "------------------------------------------------"
cd "$PROJECT_DIR/backend"
source venv/bin/activate
flask db upgrade
echo "      Migrations complete."
echo ""

echo "[5/6] Creating admin user..."
echo "------------------------------------------------"
bash "$SCRIPT_DIR/create-admin.sh"
echo ""

echo "[6/6] Installing frontend dependencies..."
echo "------------------------------------------------"
cd "$PROJECT_DIR/frontend"
npm install
echo "      Frontend dependencies installed."
echo ""

echo "========================================"
echo " Setup Complete!"
echo ""
echo " To start the development servers, run:"
echo "   ./scripts/dev-start.sh"
echo ""
echo " Default login:"
echo "   Username: admin"
echo "   Password: admin123 (or what you set)"
echo "========================================"
