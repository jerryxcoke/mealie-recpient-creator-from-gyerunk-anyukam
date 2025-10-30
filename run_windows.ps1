# Mealie Menu Creator - Windows PowerShell Script
# Usage: .\run_windows.ps1 [json_file]

param(
    [string]$JsonFile = "example_menu.json"
)

# Function to load .env file
function Load-DotEnv {
    if (Test-Path .env) {
        Write-Host "Loading configuration from .env file..." -ForegroundColor Cyan
        Get-Content .env | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
                Write-Host "  Set $name" -ForegroundColor Gray
            }
        }
    }
}

# Load .env if it exists
Load-DotEnv

# Check if API token is set
if (-not $env:MEALIE_API_TOKEN) {
    Write-Host "`nERROR: MEALIE_API_TOKEN is not set!" -ForegroundColor Red
    Write-Host "`nPlease either:" -ForegroundColor Yellow
    Write-Host "  1. Copy .env.example to .env and fill in your values" -ForegroundColor Yellow
    Write-Host "  2. Set environment variables manually:" -ForegroundColor Yellow
    Write-Host '     $env:MEALIE_BASE_URL="http://your-mealie-instance:9000"' -ForegroundColor Gray
    Write-Host '     $env:MEALIE_API_TOKEN="your_api_token_here"' -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Set default base URL if not set
if (-not $env:MEALIE_BASE_URL) {
    $env:MEALIE_BASE_URL = "http://localhost:9000"
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "Mealie Menu Creator" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "Base URL: $env:MEALIE_BASE_URL" -ForegroundColor Cyan
Write-Host "API Token: $($env:MEALIE_API_TOKEN.Substring(0, [Math]::Min(10, $env:MEALIE_API_TOKEN.Length)))..." -ForegroundColor Cyan
Write-Host "JSON File: $JsonFile" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Green

# Run the Python script
try {
    python mealie_menu_creator.py $JsonFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nScript completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nScript execution failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "`nError running script: $_" -ForegroundColor Red
    exit 1
}
