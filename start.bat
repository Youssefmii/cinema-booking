@echo off
echo Starting Cinema Booking System...
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
start "Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 2 /nobreak >/dev/null
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Both servers started! Open http://localhost:5173 in your browser.
pause
