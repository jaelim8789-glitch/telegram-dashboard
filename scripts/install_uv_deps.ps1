# TeleMon - 빠른 Python 패키지 설치 스크립트 (uv 사용)
# uv는 pip보다 10배 빠른 Python 패키지 설치 도구입니다

Write-Host "=== TeleMon UV Dependency Installer ===" -ForegroundColor Cyan

# 1. uv 설치 확인 및 설치
Write-Host "1. Checking/Installing uv..." -ForegroundColor Yellow
try {
    $uv_version = $(uv --version 2>$null)
    if ($uv_version) {
        Write-Host "uv already installed: $uv_version" -ForegroundColor Green
    } else {
        Write-Host "Installing uv..." -ForegroundColor Yellow
        python -m pip install uv
    }
} catch {
    Write-Host "Installing uv via pip..." -ForegroundColor Yellow
    python -m pip install uv
}

# 2. requirements.txt에서 패키지 설치 (uv 사용)
Write-Host "2. Installing dependencies with uv (10x faster than pip)..." -ForegroundColor Yellow
Set-Location $PSScriptRoot/../telegram-dashboard-backend
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# uv를 사용한 의존성 설치 - pip보다 10배 빠름
uv pip sync requirements.txt

$stopwatch.Stop()
Write-Host "Dependencies installed in $($stopwatch.Elapsed.TotalSeconds)s" -ForegroundColor Green

# 3. 가상 환경에 설치된 것을 확인
Write-Host "3. Verifying installation..." -ForegroundColor Yellow
python -c "import fastapi, sqlalchemy, telethon; print('✓ Core dependencies verified')"

Write-Host ""
Write-Host "✅ Installation complete with uv!" -ForegroundColor Green
Write-Host "📦 Dependencies installed 10x faster than pip" -ForegroundColor Green