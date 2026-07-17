@echo off
echo ========================================
echo  Sidra Video Downloader - Dev Start
echo ========================================
echo.
echo Starting all development services...
echo.

echo [1/4] Starting Redis (via WSL)...
start "Sidra - Redis" cmd /k "color 0C && echo === Redis Server === && wsl redis-server"
timeout /t 2 /nobreak >nul

echo [2/4] Starting Celery Worker...
start "Sidra - Celery" cmd /k "color 0E && echo === Celery Worker === && cd /d %~dp0..\backend && call venv\Scripts\activate && celery -A celery_worker.celery_app worker --loglevel=info --pool=solo"
timeout /t 2 /nobreak >nul

echo [3/4] Starting Flask Backend...
start "Sidra - Flask" cmd /k "color 0A && echo === Flask Backend === && cd /d %~dp0..\backend && call venv\Scripts\activate && flask run --debug --port 5000"
timeout /t 2 /nobreak >nul

echo [4/4] Starting Next.js Frontend...
start "Sidra - Next.js" cmd /k "color 0B && echo === Next.js Frontend === && cd /d %~dp0..\frontend && npm run dev"

echo.
echo ========================================
echo  All services started!
echo.
echo  Frontend:  http://localhost:3000
echo  Backend:   http://localhost:5000
echo  Redis:     localhost:6379
echo.
echo  Each service runs in its own window.
echo  Close this window to keep services running,
echo  or close individual service windows to stop them.
echo ========================================
echo.
pause
