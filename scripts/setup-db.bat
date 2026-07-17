@echo off
echo ========================================
echo  Sidra Video Downloader - Database Setup
echo ========================================
echo.
set /p PGUSER="PostgreSQL Username (default: postgres): "
if "%PGUSER%"=="" set PGUSER=postgres
set /p PGPASS="PostgreSQL Password: "
set /p PGHOST="PostgreSQL Host (default: localhost): "
if "%PGHOST%"=="" set PGHOST=localhost
set /p PGPORT="PostgreSQL Port (default: 5432): "
if "%PGPORT%"=="" set PGPORT=5432
echo.
echo Creating database 'sidra_downloader'...
set PGPASSWORD=%PGPASS%
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -c "CREATE DATABASE sidra_downloader;"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Database created successfully!
    echo.
    echo Writing database credentials to backend\.env ...
    
    echo # Sidra Video Downloader Backend Environment Configuration > "%~dp0..\backend\.env"
    echo FLASK_APP=wsgi.py >> "%~dp0..\backend\.env"
    echo FLASK_DEBUG=True >> "%~dp0..\backend\.env"
    echo FLASK_ENV=development >> "%~dp0..\backend\.env"
    echo SECRET_KEY=change-me-to-a-random-secret-key-for-sidra-dev >> "%~dp0..\backend\.env"
    echo JWT_SECRET_KEY=change-me-to-another-random-secret-key-for-jwt-dev >> "%~dp0..\backend\.env"
    echo DATABASE_URL=postgresql://%PGUSER%:%PGPASS%@%PGHOST%:%PGPORT%/sidra_downloader >> "%~dp0..\backend\.env"
    echo REDIS_URL=redis://localhost:6379/1 >> "%~dp0..\backend\.env"
    echo CELERY_BROKER_URL=redis://localhost:6379/0 >> "%~dp0..\backend\.env"
    echo CELERY_RESULT_BACKEND=redis://localhost:6379/0 >> "%~dp0..\backend\.env"
    echo DOWNLOAD_VIDEO_PATH=D:/Dev Projetcs/Personal Projects/youtube Downloader/downloads/videos >> "%~dp0..\backend\.env"
    echo DOWNLOAD_AUDIO_PATH=D:/Dev Projetcs/Personal Projects/youtube Downloader/downloads/audios >> "%~dp0..\backend\.env"
    echo MEDIA_VIDEO_PATH=D:/Dev Projetcs/Personal Projects/youtube Downloader/media/video >> "%~dp0..\backend\.env"
    echo MEDIA_AUDIO_PATH=D:/Dev Projetcs/Personal Projects/youtube Downloader/media/music >> "%~dp0..\backend\.env"
    echo CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 >> "%~dp0..\backend\.env"
    
    echo Credentials saved to backend\.env successfully.
) else (
    echo.
    echo Failed to create database. Please check your PostgreSQL credentials.
)
echo.
pause

