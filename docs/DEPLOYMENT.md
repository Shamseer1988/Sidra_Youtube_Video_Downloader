# Production Deployment Guide

> Deploy Sidra Video Downloader to production using Docker Compose.

---

## Prerequisites

| Tool           | Version | Installation                                        |
| -------------- | ------- | --------------------------------------------------- |
| Docker         | 24+     | [docs.docker.com](https://docs.docker.com/install/) |
| Docker Compose | 2.20+   | Included with Docker Desktop                        |

Verify installation:

```bash
docker --version
docker compose version
```

---

## Step 1: Clone Repository

```bash
git clone https://github.com/your-username/sidra-downloader.git
cd sidra-downloader
```

---

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with production values:

```env
# IMPORTANT: Change these in production!
SECRET_KEY=<generate-a-random-64-char-string>
JWT_SECRET_KEY=<generate-another-random-64-char-string>

# Database
POSTGRES_USER=sidra
POSTGRES_PASSWORD=<strong-database-password>
POSTGRES_DB=sidra_downloader
DATABASE_URL=postgresql://sidra:<strong-database-password>@db:5432/sidra_downloader

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Paths
DOWNLOAD_VIDEO_PATH=/downloads/videos
DOWNLOAD_AUDIO_PATH=/downloads/audios
MEDIA_VIDEO_PATH=/media/video
MEDIA_AUDIO_PATH=/media/music

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com
```

> [!CAUTION]
> **Never** use default passwords or secret keys in production. Generate secure values:
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## Step 3: Build and Start

```bash
# Build and start all services in detached mode
docker compose up -d --build
```

This will start:
- **frontend** — Next.js app (internal port 3000)
- **backend** — Flask API (internal port 5000)
- **worker** — Celery worker for download tasks
- **redis** — Message broker and cache
- **db** — PostgreSQL database
- **nginx** — Reverse proxy (exposed port 8080)

Verify all services are running:

```bash
docker compose ps
```

---

## Step 4: Initialize Database

```bash
# Run database migrations
docker compose exec backend flask db upgrade
```

---

## Step 5: Create Admin User

```bash
# Interactive admin creation
docker compose exec backend python create_admin.py

# Or with arguments
docker compose exec backend python create_admin.py \
  --username admin \
  --email admin@your-domain.com \
  --password <secure-password>
```

---

## Step 6: Access the Application

Open your browser and navigate to:

```
http://your-server-ip:8080
```

Log in with the admin credentials you created in Step 5.

---

## Environment Variables Reference

| Variable               | Description                          | Default                              | Required |
| ---------------------- | ------------------------------------ | ------------------------------------ | -------- |
| `FLASK_APP`            | Flask application entry point        | `wsgi.py`                            | Yes      |
| `FLASK_ENV`            | Flask environment                    | `production`                         | Yes      |
| `SECRET_KEY`           | Flask secret key for sessions        | —                                    | Yes      |
| `JWT_SECRET_KEY`       | Secret key for JWT tokens            | —                                    | Yes      |
| `DATABASE_URL`         | PostgreSQL connection string         | —                                    | Yes      |
| `POSTGRES_USER`        | PostgreSQL username                  | `sidra`                              | Yes      |
| `POSTGRES_PASSWORD`    | PostgreSQL password                  | —                                    | Yes      |
| `POSTGRES_DB`          | PostgreSQL database name             | `sidra_downloader`                   | Yes      |
| `REDIS_URL`            | Redis connection string              | `redis://redis:6379/0`               | Yes      |
| `CELERY_BROKER_URL`    | Celery broker URL                    | `redis://redis:6379/0`               | Yes      |
| `CELERY_RESULT_BACKEND`| Celery result backend URL            | `redis://redis:6379/1`               | Yes      |
| `DOWNLOAD_VIDEO_PATH`  | Path for downloaded videos           | `/downloads/videos`                  | Yes      |
| `DOWNLOAD_AUDIO_PATH`  | Path for downloaded audio            | `/downloads/audios`                  | Yes      |
| `MEDIA_VIDEO_PATH`     | Path for media video browsing        | `/media/video`                       | No       |
| `MEDIA_AUDIO_PATH`     | Path for media audio browsing        | `/media/music`                       | No       |
| `NEXT_PUBLIC_API_URL`  | Public URL for the API               | `http://localhost:5000`              | Yes      |
| `ADMIN_USERNAME`       | Default admin username (first run)   | `admin`                              | No       |
| `ADMIN_PASSWORD`       | Default admin password (first run)   | —                                    | No       |
| `ADMIN_EMAIL`          | Default admin email (first run)      | `admin@sidra.local`                  | No       |

---

## SSL/HTTPS with Let's Encrypt

### Using Certbot with Nginx

1. Install Certbot on your host:

```bash
sudo apt install certbot
```

2. Obtain a certificate:

```bash
sudo certbot certonly --standalone -d your-domain.com
```

3. Update the nginx configuration in `docker/nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of your location blocks ...
}
```

4. Mount the certificates in `docker-compose.yml`:

```yaml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
  ports:
    - "80:80"
    - "443:443"
```

5. Set up auto-renewal:

```bash
sudo crontab -e
# Add:
0 0 1 * * certbot renew --quiet && docker compose restart nginx
```

---

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose up -d --build

# Run any new migrations
docker compose exec backend flask db upgrade

# Update yt-dlp to latest version
docker compose exec backend pip install --upgrade yt-dlp
docker compose exec worker pip install --upgrade yt-dlp
docker compose restart backend worker
```

Or use the convenience script:

```bash
./scripts/update-ytdlp.sh
```

---

## Backup and Restore

### Database Backup

```bash
# Create a backup
docker compose exec db pg_dump -U sidra sidra_downloader > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use the backup script
./scripts/backup-db.sh
```

### Database Restore

```bash
# Stop the application
docker compose stop backend worker

# Restore from backup
cat backup_20240101_120000.sql | docker compose exec -T db psql -U sidra sidra_downloader

# Restart
docker compose start backend worker
```

### Full Backup (Database + Downloads)

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Database
docker compose exec db pg_dump -U sidra sidra_downloader > backups/$(date +%Y%m%d)/database.sql

# Downloaded files
tar -czf backups/$(date +%Y%m%d)/downloads.tar.gz downloads/

echo "Backup complete: backups/$(date +%Y%m%d)/"
```

### Automated Backups (Cron)

```bash
sudo crontab -e
# Daily backup at 2 AM
0 2 * * * cd /path/to/sidra-downloader && docker compose exec -T db pg_dump -U sidra sidra_downloader > /path/to/backups/daily_$(date +\%Y\%m\%d).sql
```

---

## Monitoring and Logs

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail 100 backend
```

### Service Health Checks

```bash
# Check service status
docker compose ps

# Check backend health
curl -f http://localhost:5000/api/health || echo "Backend is down"

# Check database
docker compose exec db pg_isready -U sidra

# Check Redis
docker compose exec redis redis-cli ping
```

### Resource Usage

```bash
# Container resource usage
docker stats

# Disk usage
docker system df
```

### Common Issues

| Issue                    | Solution                                              |
| ------------------------ | ----------------------------------------------------- |
| Container won't start    | Check logs: `docker compose logs <service>`           |
| Database connection error| Ensure db service is healthy: `docker compose ps`     |
| Downloads failing        | Update yt-dlp: `./scripts/update-ytdlp.sh`           |
| Out of disk space        | Clean old downloads and prune Docker: `docker system prune` |
| Port conflict            | Change port mapping in `docker-compose.yml`           |
| Permission denied        | Check volume permissions: `ls -la downloads/`         |

---

## Architecture Overview

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │ :8080 (or :443 with SSL)
                    │  (reverse   │
                    │   proxy)    │
                    └──┬──────┬──┘
                       │      │
              /api/*   │      │  /*
                       │      │
                ┌──────▼──┐ ┌─▼──────────┐
                │  Flask  │ │  Next.js   │
                │ Backend │ │  Frontend  │
                │  :5000  │ │   :3000    │
                └──┬──┬──┘ └────────────┘
                   │  │
          ┌────────┘  └────────┐
          │                    │
    ┌─────▼──────┐      ┌─────▼──────┐
    │ PostgreSQL │      │   Redis    │
    │    :5432   │      │   :6379    │
    └────────────┘      └─────┬──────┘
                              │
                        ┌─────▼──────┐
                        │   Celery   │
                        │   Worker   │
                        └─────┬──────┘
                              │
                        ┌─────▼──────┐
                        │   yt-dlp   │
                        │ (downloads)│
                        └────────────┘
```
