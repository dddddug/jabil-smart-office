@echo off
chcp 65001 >nul
echo ========================================
echo   Jabil Smart Office - Start All Services
echo ========================================
echo.

echo [1/3] Starting Nginx...
cd nginx
start "" nginx
cd ..
echo       OK

echo [2/3] Starting Backend...
cd backend
echo Set ws=CreateObject("Wscript.Shell") > "%TEMP%\run_hidden.vbs"
echo ws.Run "cmd /c npm start", 0, False >> "%TEMP%\run_hidden.vbs"
cscript //nologo "%TEMP%\run_hidden.vbs"
del "%TEMP%\run_hidden.vbs"
cd ..

echo [3/3] Starting Frontend (Vite)...
cd frontend\jabil-smart-office-frontend
start "" cmd /c "npm run dev &"
cd ..\..

echo [4/4] Waiting...
timeout /t 2 >nul

echo.
echo ========================================
echo   Services started! (running in background)
echo   Frontend: http://localhost:5173/
echo   Backend:  http://localhost:3000/
echo   Website:  http://localhost
echo ========================================
echo.
pause
