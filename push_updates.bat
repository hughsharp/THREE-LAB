@echo off
echo Status check...
"C:\Program Files\Git\cmd\git.exe" status

echo.
echo Staging all changes...
"C:\Program Files\Git\cmd\git.exe" add .

echo.
set /p commitMsg="Enter commit message (press Enter for default 'Update'): "
if "%commitMsg%"=="" set commitMsg=Update

echo.
echo Committing...
"C:\Program Files\Git\cmd\git.exe" commit -m "%commitMsg%"

echo.
echo Pushing to GitHub...
"C:\Program Files\Git\cmd\git.exe" push origin main

echo.
echo Done!
pause
