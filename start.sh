#!/bin/bash
echo "======================================================="
echo " Multi-Agent Paper Improvement System - Startup script"
echo "======================================================="

# Ensure Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js."
    exit 1
fi

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
cd backend
npx tsx src/app.ts &
BACKEND_PID=$!
cd ..

# Start Frontend in background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Trap SIGINT to kill both processes when script is stopped
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

echo "System is running. Press Ctrl+C to stop."
wait
