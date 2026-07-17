# Development Setup (Windows)

> Step-by-step guide for setting up the Sidra Video Downloader development environment on Windows.

---

## Prerequisites

Ensure the following are installed on your Windows machine:

| Tool           | Version  | Download                                                           |
| -------------- | -------- | ------------------------------------------------------------------ |
| Python         | 3.12+    | [python.org](https://www.python.org/downloads/)                    |
| Node.js        | 20 LTS+  | [nodejs.org](https://nodejs.org/)                                  |
| PostgreSQL     | 16+      | [postgresql.org](https://www.postgresql.org/download/windows/)     |
| Redis          | 7+       | Via WSL or [Memurai](https://www.memurai.com/) on Windows          |
| Git            | Latest   | [git-scm.com](https://git-scm.com/download/win)                   |
| ffmpeg         | Latest   | [ffmpeg.org](https://ffmpeg.org/download.html) or `winget install ffmpeg` |

> [!TIP]
> You can install most tools via `winget`:
> ```powershell
> winget install Python.Python.3.12
> winget install OpenJS.NodeJS.LTS
> winget install PostgreSQL.PostgreSQL.16
> winget install Git.Git
> winget install Gyan.FFmpeg
> ```

> [!IMPORTANT]
> Make sure `python`, `node`, `npm`, `psql`, `git`, and `ffmpeg` are all available in your PATH.
> Open a new PowerShell window and verify each:
> ```powershell
> python --version
> node --version
> npm --version
> psql --version
> git --version
> ffmpeg -version
> ```

---

## Step 1: Clone Repository

```powershell
git clone https://github.com/your-username/sidra-downloader.git
cd sidra-downloader
```

---

## Step 2: Set Up PostgreSQL Database

Open PowerShell and create the database:

```powershell
# Using the setup script
.\scripts\setup-db.bat

# Or manually with psql
psql -U postgres -c "CREATE DATABASE sidra_downloader;"
```

If you prefer a custom user:

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create a dedicated user
CREATE USER sidra WITH PASSWORD 'sidra_password';
CREATE DATABASE sidra_downloader OWNER sidra;
GRANT ALL PRIVILEGES ON DATABASE sidra_downloader TO sidra;
\q
```

---

## Step 3: Configure Environment

```powershell
# Copy the example environment file
Copy-Item .env.example .env

# Open in your editor
code .env    # VS Code
# or
notepad .env
```

Update the `.env` file for local development:

```env
# Flask
FLASK_APP=wsgi.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# Database (local PostgreSQL)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/sidra_downloader

# Redis (local)
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Download Paths (local directories)
DOWNLOAD_VIDEO_PATH=./downloads/videos
DOWNLOAD_AUDIO_PATH=./downloads/audios

# Media Paths
MEDIA_VIDEO_PATH=./media/video
MEDIA_AUDIO_PATH=./media/music

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Step 4: Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Verify yt-dlp is installed
yt-dlp --version

# Return to project root
cd ..
```

> [!NOTE]
> If you get an execution policy error when activating the venv, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

---

## Step 5: Run Database Migrations

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Run all pending migrations
flask db upgrade

cd ..
```

> [!WARNING]
> If migrations fail, ensure your `DATABASE_URL` in `.env` is correct and PostgreSQL is running:
> ```powershell
> # Check if PostgreSQL service is running
> Get-Service -Name "postgresql*"
> # Start it if needed
> Start-Service -Name "postgresql-x64-16"
> ```

---

## Step 6: Create Admin User

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Using the create_admin script
python create_admin.py --username admin --email admin@sidra.local --password admin123

cd ..
```

Or use the utility script:

```powershell
.\scripts\create-admin.bat
```

---

## Step 7: Start Redis

### Option A: Redis via WSL (Recommended)

```powershell
# Install Redis in WSL (first time only)
wsl sudo apt update
wsl sudo apt install redis-server -y

# Start Redis
wsl redis-server
```

### Option B: Memurai (Native Windows)

1. Download and install [Memurai](https://www.memurai.com/)
2. Memurai runs as a Windows service automatically
3. Verify: `redis-cli ping` → should return `PONG`

### Option C: Redis via Docker

```powershell
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

> [!TIP]
> Verify Redis is running:
> ```powershell
> # WSL
> wsl redis-cli ping
> # or if redis-cli is available on Windows
> redis-cli ping
> ```

---

## Step 8: Start Celery Worker

Open a **new PowerShell window**:

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Start Celery worker (use --pool=solo on Windows)
celery -A celery_worker.celery worker --loglevel=info --pool=solo
```

> [!IMPORTANT]
> The `--pool=solo` flag is **required** on Windows. The default prefork pool does not work on Windows.

---

## Step 9: Frontend Setup

Open a **new PowerShell window**:

```powershell
cd frontend

# Install Node.js dependencies
npm install
```

---

## Step 10: Start Frontend

```powershell
cd frontend

# Start Next.js development server
npm run dev
```

The frontend will be available at **http://localhost:3000**

---

## Step 11: Start Backend

Open a **new PowerShell window**:

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Start Flask development server
flask run --debug --port 5000
```

The backend API will be available at **http://localhost:5000**

---

## Running with Docker (Local Setup)

If you prefer to run the entire stack inside Docker containers on your local machine, use the interactive Docker launcher:

```powershell
.\scripts\docker-start.bat
```

This script will automatically:
1. Copy `.env.example` to `.env` in the root folder (if it doesn't already exist).
2. Prompt you to choose between **Production Mode** (exposed on port `8080` via Nginx) and **Development Mode** (with hot-reload, Next.js exposed on port `3000` and Flask API on `5000`).
3. Build and spin up all containers (Frontend, Backend, Celery Worker, PostgreSQL, Redis).
4. Run all database migrations inside the backend container.
5. Setup the default admin user account.

To stop the containers later, run:
```powershell
docker compose down
```

---

## Development URLs

| Service    | URL                      |
| ---------- | ------------------------ |
| Frontend   | http://localhost:3000     |
| Backend    | http://localhost:5000     |
| API Docs   | http://localhost:5000/api |
| Redis      | localhost:6379           |
| PostgreSQL | localhost:5432           |

---

## Troubleshooting

### "flask: command not found"

Ensure the virtual environment is activated:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
flask --version
```

### "psql: connection refused"

PostgreSQL service may not be running:

```powershell
# List PostgreSQL services
Get-Service -Name "postgresql*"

# Start the service
Start-Service -Name "postgresql-x64-16"
```

### "Redis connection refused"

Ensure Redis is running:

```powershell
# WSL
wsl redis-server --daemonize yes

# Check
wsl redis-cli ping
```

### "Celery worker not receiving tasks"

1. Check Redis is running
2. Ensure `CELERY_BROKER_URL` in `.env` matches your Redis URL
3. Restart the Celery worker

### "CORS errors in browser"

Ensure `NEXT_PUBLIC_API_URL` in `.env` is set to `http://localhost:5000` and the Flask backend has CORS enabled.

### "yt-dlp: command not found"

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install --upgrade yt-dlp
```

### "Execution policy error" (PowerShell)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port already in use

```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Database migration errors

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Check current migration status
flask db current

# If migrations are out of sync, stamp and re-run
flask db stamp head
flask db migrate -m "fix migration"
flask db upgrade
```

---

## Project Structure

```
sidra-downloader/
├── backend/                  # Flask API
│   ├── app/                  # Application package
│   │   ├── models/           # SQLAlchemy models
│   │   ├── routes/           # API route blueprints
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utility functions
│   ├── migrations/           # Alembic migrations
│   ├── create_admin.py       # Admin user creation script
│   ├── celery_worker.py      # Celery worker entry point
│   ├── wsgi.py               # WSGI entry point
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/       # React components
│   │   └── lib/              # Utilities & API client
│   ├── package.json
│   └── tailwind.config.js
├── docker/                   # Docker configs
├── docs/                     # Documentation
├── scripts/                  # Utility scripts
├── .env.example              # Environment template
├── docker-compose.yml        # Production compose
├── docker-compose.dev.yml    # Development compose
└── Makefile                  # Common commands
```
