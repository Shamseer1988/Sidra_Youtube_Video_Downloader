#!/usr/bin/env bash
set -e

echo "========================================"
echo " Sidra Video Downloader - Create Admin"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../backend"

# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Warning: Virtual environment not found."
    echo "Make sure you have run 'python3 -m venv venv' in the backend directory."
    echo ""
fi

read -p "Admin Username (default: admin): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -p "Admin Email (default: admin@sidra.local): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@sidra.local}

read -sp "Admin Password (default: admin123): " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}
echo ""

echo ""
echo "Creating admin user '$ADMIN_USER'..."

python create_admin.py --username "$ADMIN_USER" --email "$ADMIN_EMAIL" --password "$ADMIN_PASS"

if [ $? -eq 0 ]; then
    echo ""
    echo "Admin user created successfully!"
else
    echo ""
    echo "Failed to create admin user. Check the error above."
    exit 1
fi
