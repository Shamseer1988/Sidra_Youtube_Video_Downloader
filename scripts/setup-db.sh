#!/usr/bin/env bash
set -e

echo "========================================"
echo " Sidra Video Downloader - Database Setup"
echo "========================================"
echo ""

read -p "PostgreSQL Username (default: postgres): " PGUSER
PGUSER=${PGUSER:-postgres}

read -sp "PostgreSQL Password: " PGPASS
echo ""

read -p "PostgreSQL Host (default: localhost): " PGHOST
PGHOST=${PGHOST:-localhost}

read -p "PostgreSQL Port (default: 5432): " PGPORT
PGPORT=${PGPORT:-5432}

echo ""
echo "Creating database 'sidra_downloader'..."

PGPASSWORD="$PGPASS" psql -U "$PGUSER" -h "$PGHOST" -p "$PGPORT" -c "CREATE DATABASE sidra_downloader;"

if [ $? -eq 0 ]; then
    echo ""
    echo "Database created successfully!"
    echo ""
    echo "Writing database credentials to backend/.env..."
    
    cat << EOF > "$(dirname "$0")/../backend/.env"
# Sidra Video Downloader Backend Environment Configuration
FLASK_APP=wsgi.py
FLASK_DEBUG=True
FLASK_ENV=development
SECRET_KEY=change-me-to-a-random-secret-key-for-sidra-dev
JWT_SECRET_KEY=change-me-to-another-random-secret-key-for-jwt-dev
DATABASE_URL=postgresql://${PGUSER}:${PGPASS}@${PGHOST}:${PGPORT}/sidra_downloader
REDIS_URL=redis://localhost:6379/1
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
DOWNLOAD_VIDEO_PATH=downloads/videos
DOWNLOAD_AUDIO_PATH=downloads/audios
MEDIA_VIDEO_PATH=media/video
MEDIA_AUDIO_PATH=media/music
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
    
    echo "Credentials saved to backend/.env successfully."
else
    echo ""
    echo "Failed to create database. Please check your PostgreSQL credentials."
    exit 1
fi
