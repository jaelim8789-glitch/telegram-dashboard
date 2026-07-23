# TeleMon Dev Script — one command to start everything with hot-reload
# Usage:  .\dev.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== TeleMon Dev ===" -ForegroundColor Cyan

# 1. Start backend (runtime) with --reload
Write-Host "[1/2] Starting backend (uvicorn --reload)..." -ForegroundColor Yellow
$backJob = Start-Job -ScriptBlock {
    Set-Location $using:root\backend
    $env:ENVIRONMENT = "development"
    $env:RELOAD = "true"
    $env:LOG_LEVEL = "debug"
    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
}

# 2. Start frontend (Next.js with turbopack)
Write-Host "[2/2] Starting frontend (next dev --turbo)..." -ForegroundColor Yellow
$frontJob = Start-Job -ScriptBlock {
    Set-Location $using:root
    pnpm dev
}

Write-Host ""
Write-Host "Dev servers starting..." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "  API docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Cyan

try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Check if jobs are still running
        $backJob | Receive-Job -ErrorAction SilentlyContinue
        $frontJob | Receive-Job -ErrorAction SilentlyContinue
        if ($backJob.State -eq "Failed") {
            Write-Host "Backend crashed! Check logs above." -ForegroundColor Red
            break
        }
        if ($frontJob.State -eq "Failed") {
            Write-Host "Frontend crashed! Check logs above." -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "Stopping dev servers..." -ForegroundColor Yellow
    $backJob | Stop-Job | Remove-Job
    $frontJob | Stop-Job | Remove-Job
}
