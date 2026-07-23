<#
.SYNOPSIS
  Delete pnpm-lock.yaml, re-run pnpm install --no-frozen-lockfile.
#>

$lockfile = "pnpm-lock.yaml"
if (Test-Path $lockfile) {
  Write-Host "Removing $lockfile..." -ForegroundColor Yellow
  Remove-Item $lockfile -Force
  Write-Host "Running pnpm install --no-frozen-lockfile..." -ForegroundColor Cyan
  & pnpm install --no-frozen-lockfile
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Lockfile regenerated successfully." -ForegroundColor Green
  } else {
    Write-Host "pnpm install failed." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "No $lockfile found. Running pnpm install..." -ForegroundColor Cyan
  & pnpm install --no-frozen-lockfile
}
