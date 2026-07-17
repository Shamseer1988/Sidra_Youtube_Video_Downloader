@echo off
echo ========================================
echo  Sidra Video Downloader - Database Backup
echo ========================================
echo.

:: Generate timestamp for filename
set TIMESTAMP=%date:~-4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%

:: Create backups directory if it doesn't exist
if not exist "%~dp0..\backups" mkdir "%~dp0..\backups"

set BACKUP_FILE=sidra_backup_%TIMESTAMP%.sql

set /p PGUSER="PostgreSQL Username (default: postgres): "
if "%PGUSER%"=="" set PGUSER=postgres
set /p PGPASS="PostgreSQL Password: "
set /p PGHOST="PostgreSQL Host (default: localhost): "
if "%PGHOST%"=="" set PGHOST=localhost
set /p PGPORT="PostgreSQL Port (default: 5432): "
if "%PGPORT%"=="" set PGPORT=5432

echo.
echo Creating backup...
set PGPASSWORD=%PGPASS%
pg_dump -U %PGUSER% -h %PGHOST% -p %PGPORT% sidra_downloader > "%~dp0..\backups\%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Backup saved to: backups\%BACKUP_FILE%
    echo.
    for %%A in ("%~dp0..\backups\%BACKUP_FILE%") do echo File size: %%~zA bytes
) else (
    echo.
    echo Backup failed! Check your PostgreSQL credentials and connection.
)
echo.
pause
