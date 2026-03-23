#!/bin/bash
echo "======================================================="
echo " Multi-Agent Paper Improvement System - Startup script"
echo "======================================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup_port_process() {
    local port="$1"
    local name="$2"
    local pids

    pids=$(lsof -ti tcp:"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "Cleaning existing ${name} process(es) on port ${port}: $pids"
        kill $pids 2>/dev/null || true
        sleep 1
    fi
}

# Ensure Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js."
    exit 1
fi

echo "[0/4] Cleaning Existing Processes..."
cleanup_port_process 3000 "backend"
cleanup_port_process 5173 "frontend"

echo "[1/4] Installing Root/Env Dependencies..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

echo "[2/4] Installing Backend Dependencies & Setup Database..."
cd backend
npm install
npx prisma generate
npx prisma db push
cd ..

echo "[3/4] Installing Frontend Dependencies..."
cd frontend
npm install
cd ..

echo "[4/4] Starting the System..."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"

# Start Backend in background
cd "$ROOT_DIR/backend"
npx tsx src/app.ts &
BACKEND_PID=$!
cd "$ROOT_DIR"

# Start Frontend in background
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Trap SIGINT to kill both processes when script is stopped
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

echo "System is running. Press Ctrl+C to stop."
wait
