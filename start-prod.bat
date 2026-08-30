@echo off
cd /d "%~dp0backend"
start "" node server.js
cd ..
timeout /t 2 /nobreak >nul
cd nginx
start "" nginx.exe -c conf\nginx.8888.conf
cd ..
exit
