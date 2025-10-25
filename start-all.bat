@echo off
color 0A
echo ========================================
echo   SANJANA CRM - Full System Startup
echo ========================================
echo.

cd /d %~dp0

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo Node.js: OK

echo.
echo [2/4] Checking MongoDB...
echo Make sure MongoDB is running!
echo If not installed, you can use MongoDB Atlas (cloud)
echo.
timeout /t 3 >nul

echo [3/4] Starting Backend Server...
start "Sanjana CRM - Backend" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 3 >nul

echo [4/4] Starting Frontend Application...
start "Sanjana CRM - Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ========================================
echo   SYSTEM STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Two command windows have been opened.
echo Close them to stop the servers.
echo.
echo FIRST TIME SETUP:
echo 1. Create admin user using Postman (see QUICKSTART.md)
echo 2. Login at http://localhost:3000
echo.
pause
