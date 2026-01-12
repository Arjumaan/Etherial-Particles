@echo off
echo ================================
echo ETHERIAL PARTICLES - STARTUP
echo ================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

:: Check if backend dependencies are installed
echo [1/3] Checking backend dependencies...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing backend dependencies...
    pip install -r backend\requirements.txt
)

:: Start backend server in background
echo [2/3] Starting Python backend server on port 8001...
start "Etherial Backend" cmd /c "cd backend && python server.py"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start frontend server
echo [3/3] Starting frontend server on port 8000...
echo.
echo ================================
echo SERVERS RUNNING:
echo   Frontend: http://localhost:8000
echo   Backend:  http://localhost:8001
echo ================================
echo.
echo Press Ctrl+C to stop the servers
echo.

python -m http.server 8000
