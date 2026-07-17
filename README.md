<div align="center">

# 🎬 Sidra Video Downloader

### A self-hosted video & audio downloader with a modern web interface

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

*Download videos and audio from YouTube and hundreds of other sites.*
*Powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp) • Deploy anywhere with Docker • First-class Synology NAS support*

</div>

---

## ✨ Features

| | Feature | Description |
|---|---------|-------------|
| 🎬 | **Video Downloads** | Download in any quality from 4K to 360p |
| 🎵 | **Audio Extraction** | Extract audio as MP3, FLAC, M4A, or WAV |
| 📋 | **Playlist Support** | Download entire playlists with a single click |
| 🔄 | **Real-time Progress** | Live download progress via WebSocket |
| 📁 | **Media Browser** | Browse, stream, and manage downloaded files |
| 👥 | **Multi-user** | Admin and regular user roles with JWT auth |
| 🌙 | **Dark/Light Mode** | Beautiful, responsive UI with theme support |
| 🐳 | **Docker Ready** | One-command deployment with Docker Compose |
| 📦 | **Synology NAS** | First-class support for Synology deployment |
| ⚙️ | **Configurable** | Flexible settings for paths, quality, formats |
| 📊 | **Download History** | Track all downloads with search and filtering |
| 🛡️ | **Secure** | JWT auth, bcrypt hashing, CORS protection |

---

## 🚀 Quick Start

### Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/sidra-downloader.git
cd sidra-downloader

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build and start
docker compose up -d --build

# Initialize database & create admin
docker compose exec backend flask db upgrade
docker compose exec backend python create_admin.py

# Open http://localhost:8080
```

### Local Development (Windows)

```powershell
# Clone and run the first-run setup
git clone https://github.com/your-username/sidra-downloader.git
cd sidra-downloader
.\scripts\first-run.bat

# Start all services
.\scripts\dev-start.bat
```

📖 **Full guide**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

---

## 📦 Deployment

### Docker Production

Full production deployment with Nginx reverse proxy, SSL support, and automated backups.

📖 **Guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Synology NAS

Deploy on your Synology NAS with Container Manager or Portainer. Integrates with Video Station and Audio Station.

📖 **Guide**: [docs/SYNOLOGY.md](docs/SYNOLOGY.md)

---

## 🏗️ Tech Stack

```
Frontend    →  Next.js 14  •  React 18  •  Tailwind CSS
Backend     →  Flask 3.x   •  Flask-SocketIO  •  Celery
Database    →  PostgreSQL 16
Cache       →  Redis 7
Downloader  →  yt-dlp
Proxy       →  Nginx
Container   →  Docker  •  Docker Compose
```

---

## 📡 API

Full REST API with JWT authentication, WebSocket events for real-time progress, and comprehensive error handling.

📖 **Reference**: [docs/API.md](docs/API.md)

---

## 🛠️ Common Commands

```bash
# Docker
docker compose up -d --build    # Start all services
docker compose down              # Stop all services
docker compose logs -f           # View logs

# Database
docker compose exec backend flask db upgrade    # Run migrations
docker compose exec backend python create_admin.py  # Create admin

# Maintenance
./scripts/update-ytdlp.sh       # Update yt-dlp
./scripts/backup-db.sh          # Backup database

# Development
make dev                         # Start dev environment
make build                       # Build containers
make logs                        # View logs
```

---

## 📂 Project Structure

```
sidra-downloader/
├── backend/              # Flask API + Celery workers
├── frontend/             # Next.js web application
├── docker/               # Nginx config & Dockerfile
├── docs/                 # Documentation
│   ├── README.md         # Project overview
│   ├── DEVELOPMENT.md    # Local dev setup
│   ├── DEPLOYMENT.md     # Docker deployment
│   ├── SYNOLOGY.md       # Synology NAS guide
│   └── API.md            # API reference
├── scripts/              # Utility scripts (.bat + .sh)
├── docker-compose.yml    # Production compose
├── docker-compose.dev.yml    # Dev overrides
├── docker-compose.synology.yml  # Synology compose
├── .env.example          # Environment template
└── Makefile              # Common commands
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please ensure your code:
- Follows the existing code style
- Includes appropriate tests
- Updates documentation as needed

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by the Sidra team

[Documentation](docs/README.md) • [API Reference](docs/API.md) • [Report Bug](https://github.com/your-username/sidra-downloader/issues)

</div>
