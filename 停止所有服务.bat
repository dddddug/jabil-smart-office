@echo off
chcp 65001 >nul
echo ========================================
echo   Jabil Smart Office - Stop All Services
echo ========================================
echo.

echo [1/2] Stopping Nginx...
nginx -s stop 2>nul
taskkill /IM nginx.exe /F 2>nul
echo       OK

echo [2/2] Stopping Backend...
taskkill /IM node.exe /F 2>nul
echo       OK

echo.
echo ========================================
echo   All services stopped!
echo ========================================
echo.
pause
