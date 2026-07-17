#!/usr/bin/env bash
set -e

echo "========================================"
echo " Sidra Video Downloader - Database Backup"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
BACKUP_DIR="$PROJECT_DIR/backups"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="sidra_backup_${TIMESTAMP}.sql"

read -p "PostgreSQL Username (default: postgres): " PGUSER
PGUSER=${PGUSER:-postgres}

read -sp "PostgreSQL Password: " PGPASS
echo ""

read -p "PostgreSQL Host (default: localhost): " PGHOST
PGHOST=${PGHOST:-localhost}

read -p "PostgreSQL Port (default: 5432): " PGPORT
PGPORT=${PGPORT:-5432}

echo ""
echo "Creating backup..."

PGPASSWORD="$PGPASS" pg_dump -U "$PGUSER" -h "$PGHOST" -p "$PGPORT" sidra_downloader > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILESIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo ""
    echo "Backup saved to: backups/$BACKUP_FILE"
    echo "File size: $FILESIZE"
else
    echo ""
    echo "Backup failed! Check your PostgreSQL credentials and connection."
    exit 1
fi
