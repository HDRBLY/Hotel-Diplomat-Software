@echo off
echo Starting Hotel Diplomat Residency Management System...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm start"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul 