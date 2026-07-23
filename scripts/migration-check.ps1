<#
.SYNOPSIS
  Check alembic heads — single head only, output status.
#>

$backendPath = "telegram-dashboard-backend"
$alembicDir = Join-Path $backendPath "alembic"

if (-not (Test-Path (Join-Path $backendPath "alembic.ini"))) {
  Write-Host "No alembic.ini found. Checking for alternative locations..." -ForegroundColor Yellow
  $alembicInis = Get-ChildItem -Recurse -Filter "alembic.ini" -Depth 3 -ErrorAction SilentlyContinue
  if ($alembicInis.Count -eq 0) {
    Write-Host "No alembic configuration found. Skipping migration check." -ForegroundColor Gray
    exit 0
  }
  $backendPath = Split-Path $alembicInis[0].FullName -Parent
  $alembicDir = Join-Path $backendPath "alembic"
}

if (-not (Test-Path $alembicDir)) {
  Write-Host "No alembic directory found at $alembicDir" -ForegroundColor Yellow
  exit 0
}

Push-Location $backendPath
$headsOutput = & alembic heads 2>&1
$headLines = ($headsOutput | Where-Object { $_ -match "^[0-9a-f]{12}" }) -split "`n"

if ($headLines.Count -eq 0) {
  Write-Host "No migrations found." -ForegroundColor Gray
} elseif ($headLines.Count -eq 1) {
  Write-Host "Single alembic head:" -ForegroundColor Green
  $headLines | ForEach-Object { Write-Host "  $_" }
  $current = & alembic current 2>&1
  Write-Host "`nCurrent revision:" -ForegroundColor Cyan
  $current | ForEach-Object { Write-Host "  $_" }
} else {
  Write-Host "WARNING: Multiple alembic heads detected ($($headLines.Count)):" -ForegroundColor Red
  $headLines | ForEach-Object { Write-Host "  $_" }
  Write-Host "`nRun 'alembic merge heads' to resolve." -ForegroundColor Yellow
}
Pop-Location
