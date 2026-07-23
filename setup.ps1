# TeleMon Setup Script — one-command environment setup
# Usage:  .\setup.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "=== TeleMon Setup ===" -ForegroundColor Cyan

# 1. Check prerequisites
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow
$missing = @()
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { $missing += "Python 3.10+" }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { $missing += "pnpm 10+" }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $missing += "git" }
# Check uv (optional, fallback to pip)
$hasUv = $null -ne (Get-Command uv -ErrorAction SilentlyContinue)

if ($missing.Count -gt 0) {
    Write-Host "  Missing: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "  Install missing prerequisites and re-run." -ForegroundColor Red
    exit 1
}
Write-Host "  All prerequisites found. $($hasUv ? 'uv available ✓' : 'pip fallback')" -ForegroundColor Green

# 2. Install backend deps
Write-Host "[2/5] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "$root/backend"
if ($hasUv) {
    uv pip install -r requirements.txt --quiet
    Write-Host "  uv install complete" -ForegroundColor Green
} else {
    pip install -r requirements.txt --quiet
    Write-Host "  pip install complete" -ForegroundColor Green
}

# 3. Install frontend deps
Write-Host "[3/5] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location $root
pnpm install --no-frozen-lockfile --prefer-offline --no-optional
Write-Host "  pnpm install complete" -ForegroundColor Green

# 4. Setup git hooks
Write-Host "[4/5] Setting up git hooks..." -ForegroundColor Yellow
pnpm husky
Write-Host "  Git hooks ready" -ForegroundColor Green

# 5. Create .env from template if not exists
Write-Host "[5/5] Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path "$root/.env")) {
    if (Test-Path "$root/.env.local") {
        Copy-Item "$root/.env.local" "$root/.env"
        Write-Host "  .env created from .env.local" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: No .env file found. Create one from .env.local template." -ForegroundColor Yellow
    }
} else {
    Write-Host "  .env already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Run .\dev.ps1 to start development servers." -ForegroundColor Cyan
