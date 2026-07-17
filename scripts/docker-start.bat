@echo off
echo ========================================
echo  Sidra Video Downloader - Docker Launcher
echo ========================================
echo.

:: Check if root .env exists, if not copy it
if not exist "%~dp0..\.env" (
    echo [1/3] Creating .env from .env.example...
    copy "%~dp0..\.env.example" "%~dp0..\.env"
    echo Please customize database password or secrets in the root .env file if needed.
) else (
    echo [1/3] Root .env file already exists.
)
echo.

:: Prompt for Mode Selection
echo Select your local Docker deployment mode:
echo   [1] Production Mode (Recommended - Runs behind Nginx on port 8080)
echo   [2] Development Mode (Runs Next.js on port 3000 and Flask on 5000 with Hot Reload)
echo.
set /p MODE="Choose option (1 or 2, default is 1): "
if "%MODE%"=="" set MODE=1

echo.
echo [2/3] Building and starting Docker containers...
if "%MODE%"=="2" (
    echo Starting in DEVELOPMENT mode...
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
) else (
    echo Starting in PRODUCTION mode...
    docker compose up -d --build
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Failed to start Docker containers. Make sure Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Running database migrations & credentials registration...
echo Waiting 10 seconds for database service to initialize...
timeout /t 10 /nobreak >nul

echo Running flask db upgrade...
docker compose exec backend flask db upgrade

echo Running create_admin.py...
docker compose exec backend python create_admin.py

echo.
echo ========================================
echo  Sidra Video Downloader is ready!
echo.
if "%MODE%"=="2" (
    echo  Development Mode active:
    echo   - Next.js Frontend: http://localhost:3000
    echo   - Flask API Backend: http://localhost:5000
) else (
    echo  Production Mode active:
    echo   - Web UI Portal:     http://localhost:8080
)
echo  Default Login:
echo   - Username: admin
echo   - Password: admin123 (or what you set in .env)
echo ========================================
echo.
pause
