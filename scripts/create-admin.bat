@echo off
echo ========================================
echo  Sidra Video Downloader - Create Admin
echo ========================================
echo.
cd /d "%~dp0..\backend"
call venv\Scripts\activate 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Could not activate virtual environment.
    echo Make sure you have run 'python -m venv venv' in the backend directory.
    echo.
)
set /p ADMIN_USER="Admin Username (default: admin): "
if "%ADMIN_USER%"=="" set ADMIN_USER=admin
set /p ADMIN_EMAIL="Admin Email (default: admin@sidra.local): "
if "%ADMIN_EMAIL%"=="" set ADMIN_EMAIL=admin@sidra.local
set /p ADMIN_PASS="Admin Password (default: admin123): "
if "%ADMIN_PASS%"=="" set ADMIN_PASS=admin123
echo.
echo Creating admin user '%ADMIN_USER%'...
python create_admin.py --username %ADMIN_USER% --email %ADMIN_EMAIL% --password %ADMIN_PASS%
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Admin user created successfully!
) else (
    echo.
    echo Failed to create admin user. Check the error above.
)
echo.
pause
