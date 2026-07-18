<div align="center">

# 🎬 Sidra Media

### Self-hosted media hub — download from the web, stream your NAS. One app.

*A single Next.js application that combines a **yt-dlp downloader** with a
**Jellyfin-style library** for the media already on your NAS.*

**No Postgres · No Redis · No Celery · No nginx.** Just Node + SQLite + yt-dlp + ffmpeg.

</div>

---

## ✨ Features

- **Download videos & audio** from YouTube, Vimeo, SoundCloud, and [hundreds of sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) via yt-dlp — pick quality, or extract MP3.
- **Live download progress** with an in-process queue (no external broker).
- **Stream everything in the browser** — downloaded files *and* your existing NAS media, with seek/range support.
- **Jellyfin-style dashboard** — Continue Watching, Recently Downloaded, Recently Added, activity chart.
- **Library extras** — Favorites, Watch Later, Likes, Playlists, resume-where-you-left-off.
- **Multi-user** with login, sessions, and an admin area to manage accounts.
- **One Docker image** for local use and Synology NAS.

---

## 🏗️ Architecture

Everything is one Next.js app. The old multi-service stack (Flask + Celery +
Redis + Postgres + nginx) has been collapsed into:

```
Next.js (App Router)        →  UI + API route handlers
Route Handlers              →  replace the Flask REST API
In-process job queue        →  replaces Celery + Redis
Prisma + SQLite (1 file)    →  replaces PostgreSQL
yt-dlp + ffmpeg (child proc)→  downloading, thumbnails, probing
JWT httpOnly cookie         →  auth (jose + bcrypt)
```

---

## 🚀 Quick start (Docker)

```bash
cp .env.example .env          # then edit AUTH_SECRET + admin password
docker compose up -d --build
# open http://localhost:8080   →   login: admin / admin123
```

Point the volumes in `docker-compose.yml` at your media:

```yaml
volumes:
  - sidra_data:/data                       # app database + thumbnails
  - ./data/downloads/videos:/downloads/videos
  - ./data/downloads/audio:/downloads/audio
  - /path/to/your/movies:/media/videos     # existing library (browse & stream)
  - /path/to/your/music:/media/music
```

Then open **Videos → Scan** to index existing files.

---

## 🖥️ Local development

```bash
npm install
cp .env.example .env          # set AUTH_SECRET; DATABASE_URL defaults to file:./dev.db
npm run setup                 # create the SQLite schema + seed the admin user
npm run dev                   # http://localhost:3000
```

You need **`yt-dlp`** and **`ffmpeg`** on your `PATH` for downloads and
thumbnails (or set `YTDLP_PATH` / `FFMPEG_PATH` / `FFPROBE_PATH`).

---

## 📦 Synology NAS

Use `docker-compose.synology.yml` with Container Manager (Project) or Portainer.
Set the `user:` to your NAS `UID:GID` and map your shares:

```yaml
user: "1026:100"
volumes:
  - /volume1/docker/sidra-media/data:/data
  - /volume1/video:/media/videos:ro
  - /volume1/music:/media/music:ro
  - /volume1/video/Downloads:/downloads/videos
```

Downloaded files land straight in your shares, so Video Station / Audio Station
pick them up too.

---

## ⚙️ Configuration

| Variable | Purpose | Default |
|---|---|---|
| `AUTH_SECRET` | Signs session cookies — **change it** | insecure dev value |
| `DATABASE_URL` | SQLite file location | `file:./dev.db` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` | First-run admin | `admin` / `admin123` |
| `DOWNLOAD_VIDEO_PATH` / `DOWNLOAD_AUDIO_PATH` | Where downloads are saved | `./media/downloads/*` |
| `MEDIA_VIDEO_PATH` / `MEDIA_AUDIO_PATH` | Existing libraries to index (comma-separated) | `./media/library/*` |
| `THUMBNAIL_CACHE_DIR` | Generated thumbnail cache | `./media/.thumbnails` |
| `MAX_CONCURRENT_DOWNLOADS` | Parallel downloads | `2` |
| `YTDLP_PATH` / `FFMPEG_PATH` / `FFPROBE_PATH` | Binary overrides | from `PATH` |

---

## 🔌 API overview

All endpoints live under `/api` and use the session cookie for auth.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` · `/logout` · `GET /me` | Auth |
| `GET/POST` | `/api/downloads` | List / start downloads |
| `POST` | `/api/downloads/info` | Probe a URL (title, formats) |
| `POST/DELETE` | `/api/downloads/{id}` | Retry / cancel+delete |
| `GET` | `/api/library` | Browse library (filters, search, sort) |
| `PATCH` | `/api/library/{id}/state` | Favorite / watch-later / like / progress |
| `POST` | `/api/library/scan` | Re-index media folders |
| `GET` | `/api/stream/{id}` · `/api/thumbnail/{id}` | Range stream / thumbnail |
| `GET/POST` | `/api/playlists` (+ `/{id}`, `/{id}/items`) | Playlists |
| `GET` | `/api/stats` | Dashboard data |
| `GET/POST/PATCH/DELETE` | `/api/users` | User management (admin) |

---

## 📄 License

MIT.
