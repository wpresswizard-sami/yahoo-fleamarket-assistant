@echo off
title Yahoo! Auction to Flea Market Reseller Assistant
cd /d "%~dp0"

echo ====================================================================
echo   Yahoo! Auction to Yahoo! Flea Market Reseller Assistant
echo   ヤフオク -^> Yahoo!フリマ 転売アシスタント
echo ====================================================================
echo.

:: Check python command
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
    echo [ERROR] Python was not found on your system!
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo [1/2] Checking Python environment...
"%PYTHON_CMD%" --version

echo [2/2] Starting local application server...
"%PYTHON_CMD%" server.py

pause
