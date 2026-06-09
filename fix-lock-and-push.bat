@echo off
cd /d "%~dp0"
if exist .git\index.lock del /f .git\index.lock && echo Deleted stale lock
git add .
git commit -m "feat: weekly activities, drawing canvas, exercise sheet, child profile, AppContext updates"
git push
echo.
echo Done! Press any key to close.
pause
