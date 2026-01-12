#!/bin/bash
echo "================================"
echo "ETHERIAL PARTICLES - STARTUP"
echo "================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

# Install backend dependencies if needed
echo "[1/3] Checking backend dependencies..."
pip3 show fastapi > /dev/null 2>&1 || pip3 install -r backend/requirements.txt

# Start backend server in background
echo "[2/3] Starting Python backend server on port 8001..."
cd backend && python3 server.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "[3/3] Starting frontend server on port 8000..."
echo ""
echo "================================"
echo "SERVERS RUNNING:"
echo "  Frontend: http://localhost:8000"
echo "  Backend:  http://localhost:8001"
echo "================================"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

python3 -m http.server 8000

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
