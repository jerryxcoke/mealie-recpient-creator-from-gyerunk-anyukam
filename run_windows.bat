@echo off
REM Mealie Menu Creator - Windows Batch Script
REM Usage: run_windows.bat [json_file]

REM Check if .env file exists and load it
if exist .env (
    echo Loading configuration from .env file...
    for /f "tokens=1,* delims==" %%a in (.env) do (
        if not "%%a"=="" if not "%%b"=="" (
            set %%a=%%b
        )
    )
)

REM Check if API token is set
if "%MEALIE_API_TOKEN%"=="" (
    echo ERROR: MEALIE_API_TOKEN is not set!
    echo.
    echo Please either:
    echo   1. Copy .env.example to .env and fill in your values
    echo   2. Set environment variables manually:
    echo      set MEALIE_BASE_URL=http://your-mealie-instance:9000
    echo      set MEALIE_API_TOKEN=your_api_token_here
    echo.
    pause
    exit /b 1
)

REM Set default base URL if not set
if "%MEALIE_BASE_URL%"=="" (
    set MEALIE_BASE_URL=http://localhost:9000
)

echo.
echo ============================================
echo Mealie Menu Creator
echo ============================================
echo Base URL: %MEALIE_BASE_URL%
echo API Token: %MEALIE_API_TOKEN:~0,10%...
echo ============================================
echo.

REM Run the Python script
if "%1"=="" (
    python mealie_menu_creator.py example_menu.json
) else (
    python mealie_menu_creator.py %1
)

if errorlevel 1 (
    echo.
    echo Script execution failed!
    pause
    exit /b 1
)

echo.
echo Script completed successfully!
pause
