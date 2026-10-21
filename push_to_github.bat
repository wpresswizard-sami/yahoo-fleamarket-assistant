@echo off
set "PATH=C:\Users\Sami\AppData\Local\Programs\Git\cmd;%PATH%"
cd /d "C:\Users\Sami\yahoo-fleamarket-assistant"
echo ========================================================
echo   Uploading Yahoo Flea Market Assistant to GitHub...
echo ========================================================
git push -u origin main
echo.
echo ========================================================
echo   Done! Check your GitHub repository:
echo   https://github.com/wpresswizard-sami/yahoo-fleamarket-assistant
echo ========================================================
pause
