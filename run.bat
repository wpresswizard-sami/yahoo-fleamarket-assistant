@echo off
title Yahoo! Auction to Flea Market Reseller Assistant
cd /d "%~dp0"

echo ====================================================================
echo   Yahoo! Auction to Yahoo! Flea Market Reseller Assistant
echo   Setup & Launch Script
echo ====================================================================
echo.

:: Detect Python
set "PYTHON_CMD="
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=py"
    ) else (
        where python >nul 2>nul
        if %errorlevel% equ 0 (
            set "PYTHON_CMD=python"
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found!
    echo Please download and install Python (check 'Add python.exe to PATH'):
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [1/3] Python detected:
"%PYTHON_CMD%" --version

echo.
echo [2/3] Installing / verifying required libraries (fastapi, uvicorn, requests, bs4)...
"%PYTHON_CMD%" -m pip install -r requirements.txt --quiet --disable-pip-version-check

echo.
echo [3/3] Starting Assistant Server and opening your browser...
echo.
echo Open this URL if browser does not pop up: http://localhost:8000
echo.
"%PYTHON_CMD%" server.py

pause
