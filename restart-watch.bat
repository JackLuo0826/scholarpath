@echo off
echo Stopping any running node watch-deploy processes...
taskkill /f /im node.exe /fi "WINDOWTITLE eq watch-deploy*" 2>nul
timeout /t 2 /nobreak >nul
echo Clearing git lock...
del /f ".git\index.lock" 2>nul && echo Lock cleared || echo No lock found
echo.
echo Restarting watch-deploy...
start "watch-deploy" node watch-deploy.js
echo Done! Watch-deploy is running fresh.
timeout /t 3 /nobreak >nul
