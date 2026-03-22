@echo off
echo =======================================================
echo  Multi-Agent Paper Improvement System - Startup script
echo =======================================================

node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js is required but not installed. Please install Node.js.
    pause
    exit /b 1
)

echo [1/4] Installing Root/Env Dependencies...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
)

echo [2/4] Installing Backend Dependencies ^& Setup Database...
cd backend
call npm install
call npx prisma generate
call npx prisma db push
cd ..

echo [3/4] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo [4/4] Starting the System...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173

start cmd /k "cd backend && npx tsx src/app.ts"
start cmd /k "cd frontend && npm run dev"

echo System is starting in new windows...
