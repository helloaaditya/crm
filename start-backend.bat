@echo off
echo ========================================
echo   SANJANA CRM - Backend Server
echo ========================================
echo.

cd /d %~dp0

echo [1/2] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo Node.js: OK

echo.
echo [2/2] Starting backend server...
echo Server will run on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
