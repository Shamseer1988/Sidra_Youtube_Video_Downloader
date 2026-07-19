# SidraMedia — Synology NAS Deployment Guide (via SSH)

Step-by-step instructions for running SidraMedia in a Docker container on a
Synology NAS using SSH. Takes about 15 minutes.

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| Synology NAS with DSM 7.x | An x86-64 model (DS220+, DS423+, DS920+, DS1522+, …). ARM models are not supported by this image. |
| **Container Manager** package | Install from **Package Center** (on DSM 6 it's called *Docker*). |
| An admin DSM account | Needed for SSH and Docker commands. |
| ~2 GB free space on the system volume | For the image + build cache. |

---

## 2. Enable SSH on the NAS

1. Open **DSM → Control Panel → Terminal & SNMP → Terminal**.
2. Tick **Enable SSH service** (keep port `22` or choose your own).
3. Click **Apply**.
4. From your computer, connect (replace with your DSM username and NAS IP):

   ```bash
   ssh your-admin-user@192.168.1.50
   ```

   On Windows use PowerShell, Windows Terminal, or PuTTY.

> Tip: after everything works you can disable SSH again — the container keeps
> running without it.

---

## 3. Create the folder structure

All app files live under `/volume1/docker/sidra-media`:

```bash
sudo mkdir -p /volume1/docker/sidra-media
sudo chown -R "$USER":users /volume1/docker/sidra-media
cd /volume1/docker/sidra-media
```

Decide where media should live. A typical layout using the standard
Synology shared folders:

| Purpose | NAS path (host) | Path inside container |
|---|---|---|
| App database + thumbnails | `/volume1/docker/sidra-media/data` | `/data` |
| New video downloads | `/volume1/video/Downloads` | `/downloads/videos` |
| New audio downloads | `/volume1/music/Downloads` | `/downloads/audio` |
| Existing video library | `/volume1/video` | `/media/videos` |
| Existing music library | `/volume1/music` | `/media/music` |

Create the download folders if they don't exist yet:

```bash
mkdir -p /volume1/video/Downloads /volume1/music/Downloads
mkdir -p /volume1/docker/sidra-media/data
```

---

## 4. Get the code onto the NAS

**Option A — Git (if Git Server package or `git` is available):**

```bash
cd /volume1/docker/sidra-media
git clone https://github.com/Shamseer1988/Sidra_Youtube_Video_Downloader.git app
cd app
```

**Option B — Upload manually:**

1. Download the repository as a ZIP from GitHub (**Code → Download ZIP**).
2. Upload it with **File Station** into `docker/sidra-media`.
3. Right-click → **Extract**, then over SSH:

   ```bash
   cd /volume1/docker/sidra-media/app   # the extracted folder
   ```

---

## 5. Configure the deployment

Find your user/group IDs (used so downloaded files get sane ownership):

```bash
id
# uid=1026(youruser) gid=100(users) ...
```

Edit the Synology compose file:

```bash
nano docker-compose.synology.yml
```

Change at minimum:

```yaml
environment:
  AUTH_SECRET: "PASTE-A-LONG-RANDOM-STRING-HERE"   # e.g. from: openssl rand -hex 32
  ADMIN_USERNAME: "admin"
  ADMIN_PASSWORD: "choose-a-strong-password"
  ADMIN_EMAIL: "you@example.com"
  NAS_NAME: "SIDRA-NAS"          # display name shown in the dashboard
user: "1026:100"                 # <-- your uid:gid from `id`
volumes:
  - /volume1/docker/sidra-media/data:/data
  - /volume1/video/Downloads:/downloads/videos
  - /volume1/music/Downloads:/downloads/audio
  - /volume1/video:/media/videos:ro
  - /volume1/music:/media/music:ro
```

Save with `Ctrl+O`, `Enter`, exit with `Ctrl+X`.

> **Important:** any folder you later want to add from **Settings → Media
> Folders** in the UI must be mounted here as a volume first. The app can
> only see paths that exist *inside* the container.

---

## 6. Build and start the container

```bash
cd /volume1/docker/sidra-media/app
sudo docker compose -f docker-compose.synology.yml up -d --build
```

(If `docker compose` is not found, use `sudo docker-compose -f docker-compose.synology.yml up -d --build`.)

The first build takes 5–10 minutes (downloads Node, ffmpeg, yt-dlp and
builds the app). Watch progress; when it finishes check:

```bash
sudo docker ps --filter name=sidra-media
sudo docker logs -f sidra-media     # Ctrl+C to stop following
```

You should see:

```
[entrypoint] Syncing database schema…
[entrypoint] Ensuring admin account…
[entrypoint] Starting Sidra Media on port 3000
```

---

## 7. First login

1. Open `http://YOUR-NAS-IP:8080` in a browser.
2. Sign in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set.
3. Go to **Settings → Library Scan → Scan now** to index your mounted
   libraries. Large libraries take a few minutes on first scan.

The dashboard's **Storage** and **System Health** read live data from the
NAS kernel (volume usage via `statfs`, CPU/RAM/network/temperature via
`/proc` and `/sys`) — no extra setup needed.

---

## 8. Adding more media folders later

**From the UI (recommended):**

1. Mount the share into the container: add another line under `volumes:` in
   `docker-compose.synology.yml`, e.g.

   ```yaml
   - /volume1/photo/HomeVideos:/media/homevideos:ro
   ```

2. Recreate the container:

   ```bash
   sudo docker compose -f docker-compose.synology.yml up -d
   ```

3. In the app go to **Settings → Media Folders**, choose *video* or *audio*,
   enter the **container path** (`/media/homevideos`) and click **Add
   Folder**, then run a scan.

---

## 9. Updating SidraMedia

```bash
cd /volume1/docker/sidra-media/app
git pull                                   # or re-upload the new ZIP
sudo docker compose -f docker-compose.synology.yml up -d --build
```

Your database, thumbnails, users and settings persist in
`/volume1/docker/sidra-media/data`.

---

## 10. Optional: HTTPS with a nice URL (DSM Reverse Proxy)

1. **Control Panel → Login Portal → Advanced → Reverse Proxy → Create**:
   - Source: `HTTPS`, hostname `sidra.your-domain.com`, port `443`
   - Destination: `HTTP`, `localhost`, port `8080`
2. Under **Custom Header → Create → WebSocket**, add the two WebSocket headers.
3. Issue a certificate under **Control Panel → Security → Certificate**
   (Let's Encrypt) and assign it to the reverse-proxy entry.

Now the app is available at `https://sidra.your-domain.com`.

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| `exec docker-entrypoint.sh failed: No such file or directory` | The entrypoint got Windows line endings. Pull the latest code (the build strips CRLF automatically) and rebuild. |
| Build fails with `Cannot find module '@tailwindcss/postcss'` | Old code. Pull the latest — `npm ci --include=dev` is required in the Dockerfile. |
| `permission denied` writing downloads | The `user:` uid:gid in the compose file has no write permission on the download shares. Check **Control Panel → Shared Folder → Permissions**, or run `id` again and fix the value. |
| Port 8080 already in use | Change the mapping in the compose file, e.g. `"9090:3000"`, and re-run `up -d`. |
| Videos won't play in browser | Browsers can't play every codec (e.g. some `.mkv`/HEVC). The file is fine — download it or play via a media player. |
| No temperature in System Health | Some Synology models don't expose thermal sensors to containers — the card is hidden automatically. |
| Container time is wrong | Add `TZ: "Asia/Qatar"` (your timezone) under `environment:`. |

Useful commands:

```bash
sudo docker logs -f sidra-media          # live logs
sudo docker restart sidra-media          # restart the app
sudo docker compose -f docker-compose.synology.yml down   # stop & remove
sudo docker image prune -f               # clean old build layers
```

---

## 12. Autostart

Containers started with `restart: unless-stopped` (already set in the
compose file) start automatically when the NAS boots — nothing else to do.
