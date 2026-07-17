# Synology NAS Deployment Guide

> Deploy Sidra Video Downloader on your Synology NAS using Docker (Container Manager).

---

## Prerequisites

| Requirement             | Details                                           |
| ----------------------- | ------------------------------------------------- |
| Synology NAS            | x86_64 or ARM-based models                       |
| DSM                     | 7.2 or later                                      |
| Container Manager       | Installed from Package Center (replaces Docker)   |
| SSH Access              | Enabled via Control Panel → Terminal & SNMP       |
| Available RAM           | Minimum 2 GB free                                 |
| Available Storage       | Minimum 10 GB for application + downloads         |

> [!NOTE]
> On DSM 7.2+, the Docker package has been renamed to **Container Manager**. The underlying Docker engine remains the same.

---

## Step 1: Create Folder Structure

Using **File Station**, create the following folder structure:

```
/volume1/docker/sidra-downloader/
├── postgres-data/
├── redis-data/
├── downloads/
│   ├── videos/
│   └── audios/
├── .env
└── docker-compose.yml
```

Or via SSH:

```bash
# SSH into your Synology
ssh admin@your-nas-ip

# Create directories
sudo mkdir -p /volume1/docker/sidra-downloader/{postgres-data,redis-data,downloads/{videos,audios}}

# Set permissions
sudo chown -R 1000:1000 /volume1/docker/sidra-downloader/downloads
sudo chmod -R 755 /volume1/docker/sidra-downloader
```

---

## Step 2: Upload Project Files

### Option A: Clone via SSH

```bash
ssh admin@your-nas-ip
cd /volume1/docker/sidra-downloader
sudo git clone https://github.com/your-username/sidra-downloader.git .
```

### Option B: Upload via File Station

1. On your computer, download the project as a ZIP
2. Open **File Station** on your NAS
3. Navigate to `/docker/sidra-downloader/`
4. Upload and extract the ZIP file

---

## Step 3: Configure Environment

Create or edit the `.env` file in `/volume1/docker/sidra-downloader/`:

```env
# Sidra Video Downloader - Synology Configuration
# =================================================

# Flask
FLASK_APP=wsgi.py
FLASK_ENV=production
SECRET_KEY=change-me-to-a-random-secret-key
JWT_SECRET_KEY=change-me-to-another-random-secret-key

# Database
DATABASE_URL=postgresql://sidra:sidra_password@db:5432/sidra_downloader
POSTGRES_USER=sidra
POSTGRES_PASSWORD=sidra_password
POSTGRES_DB=sidra_downloader

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Download Paths (inside container)
DOWNLOAD_VIDEO_PATH=/downloads/videos
DOWNLOAD_AUDIO_PATH=/downloads/audios

# Media Paths (mapped to Synology shared folders)
# These paths inside the container map to your NAS media folders
MEDIA_VIDEO_PATH=/media/video
MEDIA_AUDIO_PATH=/media/music

# Frontend
NEXT_PUBLIC_API_URL=http://your-nas-ip:8080

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
ADMIN_EMAIL=admin@your-nas.local
```

> [!IMPORTANT]
> Key paths for Synology:
> - `DOWNLOAD_VIDEO_PATH=/downloads/videos` → mapped to `/volume1/docker/sidra-downloader/downloads/videos`
> - `DOWNLOAD_AUDIO_PATH=/downloads/audios` → mapped to `/volume1/docker/sidra-downloader/downloads/audios`
> - `MEDIA_VIDEO_PATH=/media/video` → mapped to `/volume1/video` (Synology Video Station folder)
> - `MEDIA_AUDIO_PATH=/media/music` → mapped to `/volume1/music` (Synology Audio Station folder)

---

## Step 4: Docker Compose with Synology Volume Mappings

Use the Synology-specific compose file or copy it as your `docker-compose.yml`:

```bash
# SSH into your NAS
cd /volume1/docker/sidra-downloader

# Use the Synology-specific compose file
cp docker-compose.synology.yml docker-compose.yml
```

The Synology compose file includes:
- Synology-specific volume paths (`/volume1/...`)
- Media folder mounts for Video Station and Audio Station
- Resource limits suitable for NAS hardware
- Restart policies for auto-start on boot
- Health checks for all services

---

## Step 5: Deploy via Container Manager (GUI)

If you prefer using the Container Manager GUI instead of SSH:

### 5.1 — Open Container Manager

1. Open **Container Manager** from DSM desktop
2. Click **Project** in the left sidebar
3. Click **Create**

### 5.2 — Create the Project

1. **Project Name**: `sidra-downloader`
2. **Path**: Select `/docker/sidra-downloader/`
3. **Source**: Choose "Use existing docker-compose.yml"
   - If no file exists, paste the contents of `docker-compose.synology.yml`
4. Click **Next**

### 5.3 — Configure Environment

1. The wizard will detect the `.env` file
2. Review and modify any variables as needed
3. Click **Next**

### 5.4 — Review and Deploy

1. Review the service configuration summary
2. Click **Done** to build and start all containers
3. Wait for all containers to show green (running) status

### 5.5 — Initialize Database

1. In Container Manager, click on the **sidra-downloader-backend** container
2. Click **Terminal** → **Create** → `/bin/bash`
3. Run:
   ```bash
   flask db upgrade
   python create_admin.py
   ```

---

## Step 6: Deploy via Portainer (Alternative)

If you have Portainer installed on your Synology:

### 6.1 — Access Portainer

Navigate to `http://your-nas-ip:9000`

### 6.2 — Create Stack

1. Go to **Stacks** → **Add stack**
2. **Name**: `sidra-downloader`
3. **Build method**: Upload
4. Upload `docker-compose.synology.yml`
5. Under **Environment variables**, load from `.env` file or add manually
6. Click **Deploy the stack**

### 6.3 — Initialize

1. Go to the **backend** container → **Console**
2. Connect as `/bin/bash`
3. Run:
   ```bash
   flask db upgrade
   python create_admin.py
   ```

---

## Permissions

> [!WARNING]
> Permissions are the most common source of issues on Synology. Ensure the Docker containers can read/write to all mounted volumes.

```bash
# SSH into your NAS
ssh admin@your-nas-ip

# Set ownership for download directories
sudo chown -R 1000:1000 /volume1/docker/sidra-downloader/downloads/

# Ensure the docker group has access
sudo chmod -R 775 /volume1/docker/sidra-downloader/downloads/

# If mapping to Synology shared folders, ensure access
sudo chmod -R 775 /volume1/video
sudo chmod -R 775 /volume1/music
```

If you're still having permission issues:

```bash
# Find the UID/GID used inside the container
docker exec sidra-downloader-backend id

# Set matching ownership
sudo chown -R <uid>:<gid> /volume1/docker/sidra-downloader/downloads/
```

---

## Port Mapping & Firewall

### Default Ports

| Service  | Container Port | Host Port | Protocol |
| -------- | -------------- | --------- | -------- |
| Nginx    | 80             | 8080      | TCP      |
| Frontend | 3000           | (internal)| —        |
| Backend  | 5000           | (internal)| —        |
| Postgres | 5432           | (internal)| —        |
| Redis    | 6379           | (internal)| —        |

### Synology Firewall Configuration

1. Go to **Control Panel** → **Security** → **Firewall**
2. Click **Edit Rules**
3. Add a rule:
   - **Ports**: Custom → `8080`
   - **Action**: Allow
   - **Source IP**: Your local network (e.g., `192.168.1.0/24`)
4. Click **OK** and **Apply**

> [!TIP]
> Only expose port 8080 (Nginx). All other services communicate internally via Docker networking.

---

## Auto-Start on Boot

The `docker-compose.synology.yml` includes `restart: unless-stopped` for all services, which means:

- ✅ Containers restart automatically after NAS reboot
- ✅ Containers restart if they crash
- ❌ Containers stay stopped if you manually stop them

To verify auto-start is working:

```bash
# Reboot your NAS
sudo reboot

# After reboot, check containers
docker ps
```

If containers don't auto-start, enable the Docker service auto-start:

1. **Control Panel** → **Task Scheduler**
2. **Create** → **Triggered Task** → **User-defined script**
3. **Event**: Boot-up
4. **Task Settings** → Script:
   ```bash
   cd /volume1/docker/sidra-downloader && docker compose up -d
   ```

---

## Accessing Media from Synology Apps

### Video Station Integration

Downloaded videos can be accessed via Synology Video Station:

1. The `docker-compose.synology.yml` maps `/volume1/video` to the container
2. Videos downloaded to the media path appear in Video Station
3. Open **Video Station** and browse your downloaded content
4. Video Station will automatically index new files

### Audio Station Integration

Downloaded audio files work with Audio Station:

1. Audio files are mapped to `/volume1/music`
2. Open **Audio Station** to browse downloaded music
3. Audio Station indexes MP3, FLAC, and other audio formats

> [!NOTE]
> It may take a few minutes for Video Station and Audio Station to index newly downloaded files. You can trigger a manual re-index from each application's settings.

---

## Performance Tuning

### For ARM-based Synology Models (DS220j, DS223, etc.)

ARM-based models have limited resources. Apply these optimizations:

```yaml
# In docker-compose.synology.yml, reduce resource limits:
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 256M

  worker:
    deploy:
      resources:
        limits:
          memory: 512M
    environment:
      - CELERY_WORKER_CONCURRENCY=1  # Single concurrent download

  db:
    deploy:
      resources:
        limits:
          memory: 256M
    command: >
      postgres
      -c shared_buffers=64MB
      -c effective_cache_size=128MB
      -c max_connections=20

  redis:
    deploy:
      resources:
        limits:
          memory: 64M
```

### For x86_64 Models (DS920+, DS1621+, etc.)

These models can handle more concurrent downloads:

```yaml
services:
  worker:
    environment:
      - CELERY_WORKER_CONCURRENCY=3  # Up to 3 concurrent downloads

  db:
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=512MB
      -c max_connections=50
```

### Storage Recommendations

| Volume Type | Recommendation                     |
| ----------- | ---------------------------------- |
| SSD Cache   | Use for PostgreSQL data            |
| HDD RAID    | Use for downloads and media        |
| NVMe        | Ideal for Redis data               |

---

## Synology-Specific Compose File

The complete `docker-compose.synology.yml` is included in the project root. It contains all Synology-specific configurations:

- Volume paths using `/volume1/docker/sidra-downloader/`
- Media folder mounts for Video Station (`/volume1/video`) and Audio Station (`/volume1/music`)
- Resource limits suitable for NAS hardware
- `restart: unless-stopped` for all services
- Health checks for database and Redis
- Internal Docker network isolation

See [`docker-compose.synology.yml`](../docker-compose.synology.yml) for the full configuration.

---

## Troubleshooting

### Containers won't start

```bash
# Check logs
cd /volume1/docker/sidra-downloader
docker compose logs

# Check specific service
docker compose logs backend
```

### Permission denied errors

```bash
# Fix download directory permissions
sudo chown -R 1000:1000 /volume1/docker/sidra-downloader/downloads/
sudo chmod -R 775 /volume1/docker/sidra-downloader/downloads/
```

### Out of memory (ARM models)

Reduce resource limits in the compose file or download fewer items concurrently.

### Cannot access from network

1. Check Synology Firewall (Control Panel → Security → Firewall)
2. Ensure port 8080 is allowed
3. Try accessing via `http://<nas-ip>:8080`

### Database connection errors after reboot

```bash
# Restart all services in correct order
cd /volume1/docker/sidra-downloader
docker compose down
docker compose up -d
```

### Updating the application

```bash
cd /volume1/docker/sidra-downloader
git pull origin main
docker compose up -d --build
docker compose exec backend flask db upgrade
```
