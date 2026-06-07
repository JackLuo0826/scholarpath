@echo off
cd /d "%~dp0"
echo Starting ScholarPath auto-deploy watcher...
echo Every file change will be auto-committed and pushed to Vercel.
echo Close this window to stop watching.
echo.
node watch-deploy.js
pause
