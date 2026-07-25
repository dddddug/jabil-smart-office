@echo off
chcp 65001 >nul
echo ========================================
echo   Jabil Smart Office - 启动所有服务
echo ========================================
echo.

echo [1/3] 启动 Nginx...
start nginx
echo       ✓ Nginx 已启动

echo [2/3] 启动后端服务...
cd backend
start cmd /k "npm start"
cd ..

echo [3/3] 等待服务启动...
timeout /t 3 >nul

echo.
echo ========================================
echo   ✓ 所有服务已启动！
echo.
echo   本机访问: http://localhost
echo   局域网:   http://10.114.32.157
echo ========================================
echo.
pause
