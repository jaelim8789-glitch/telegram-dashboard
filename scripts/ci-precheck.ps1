#!/usr/bin/env pwsh
# CI precheck script: Run build + lint + typecheck in one command

Write-Host "Running CI precheck: build + lint + typecheck" -ForegroundColor Cyan

# Type check
Write-Host "`n1. Running TypeScript type check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "TypeScript check failed!" -ForegroundColor Red
    exit 1
}

# Lint check
Write-Host "`n2. Running ESLint check..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "ESLint check failed!" -ForegroundColor Red
    exit 1
}

# Build check
Write-Host "`n3. Running build check..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All CI checks passed!" -ForegroundColor Green
Write-Host "Ready to push to remote repository." -ForegroundColor Green