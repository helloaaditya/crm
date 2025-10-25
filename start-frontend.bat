@echo off
echo ========================================
echo   SANJANA CRM - Frontend Application
echo ========================================
echo.

cd /d %~dp0\frontend

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
echo [2/2] Starting frontend development server...
echo Application will run on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
