@echo off
chcp 65001 >nul
echo ========================================
echo   Jabil Smart Office - 停止所有服务
echo ========================================
echo.

echo [1/2] 停止 Nginx...
nginx -s stop 2>nul
taskkill /IM nginx.exe /F 2>nul
echo       ✓ Nginx 已停止

echo [2/2] 停止后端进程...
taskkill /IM node.exe /F 2>nul
echo       ✓ 后端进程已停止

echo.
echo ========================================
echo   ✓ 所有服务已停止！
echo ========================================
echo.
pause
