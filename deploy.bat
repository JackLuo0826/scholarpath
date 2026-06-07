@echo off
cd /d "%~dp0"
git add .
set /p msg="Commit message (or press Enter for 'update'): "
if "%msg%"=="" set msg=update
git commit -m "%msg%"
git push origin master
echo.
echo Done! Vercel is deploying to https://scholarpath-blue.vercel.app
pause
