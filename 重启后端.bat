@echo off
chcp 65001 >nul
echo ========================================
echo   Jabil Smart Office - Restart Backend
echo ========================================
echo.

echo [1/2] Stopping backend...
taskkill /IM node.exe /F 2>nul
echo       OK

echo [2/2] Starting backend...
cd backend
echo Set ws=CreateObject("Wscript.Shell") > "%TEMP%\run_hidden.vbs"
echo ws.Run "cmd /c npm start", 0, False >> "%TEMP%\run_hidden.vbs"
cscript //nologo "%TEMP%\run_hidden.vbs"
del "%TEMP%\run_hidden.vbs"
cd ..

echo.
echo ========================================
echo   Backend restarted! (running in background)
echo ========================================
echo.
timeout /t 2 >nul
