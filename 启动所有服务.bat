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

echo [3/3] Waiting...
timeout /t 2 >nul

echo.
echo ========================================
echo   Services started! (running in background)
echo   http://localhost
echo ========================================
echo.
pause
