@echo off
chcp 65001 >nul
echo ========================================
echo   Jabil Smart Office - 重启后端服务
echo ========================================
echo.

echo [1/2] 停止后端进程...
for /f "tokens=5" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr "PID"') do (
    taskkill /PID %%a /F 2>nul
)
echo       ✓ 后端进程已停止

echo [2/2] 启动后端服务...
cd backend
start cmd /k "npm start"
cd ..

echo.
echo ========================================
echo   ✓ 后端服务已重启！
echo ========================================
echo.
pause
