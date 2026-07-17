@echo off
echo ========================================
echo  Sidra Video Downloader - First Run Setup
echo ========================================
echo.
echo This script will set up everything you need to run Sidra Video Downloader.
echo.
echo [1/6] Setting up Python virtual environment...
echo ------------------------------------------------
cd /d "%~dp0..\backend"
python -m venv venv
call venv\Scripts\activate
echo       Virtual environment created and activated.
echo.

echo [2/6] Installing Python dependencies...
echo ------------------------------------------------
pip install -r requirements.txt
echo       Python dependencies installed.
echo.

echo [3/6] Setting up database...
echo ------------------------------------------------
call "%~dp0setup-db.bat"
echo.

echo [4/6] Running database migrations...
echo ------------------------------------------------
cd /d "%~dp0..\backend"
call venv\Scripts\activate
flask db upgrade
echo       Migrations complete.
echo.

echo [5/6] Creating admin user...
echo ------------------------------------------------
call "%~dp0create-admin.bat"
echo.

echo [6/6] Installing frontend dependencies...
echo ------------------------------------------------
cd /d "%~dp0..\frontend"
npm install
echo       Frontend dependencies installed.
echo.

echo ========================================
echo  Setup Complete!
echo.
echo  To start the development servers, run:
echo    scripts\dev-start.bat
echo.
echo  Default login:
echo    Username: admin
echo    Password: admin123 (or what you set)
echo ========================================
echo.
pause
