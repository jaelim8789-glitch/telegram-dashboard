<#
.SYNOPSIS
  Safe Docker rollback — re-tag previous image and restart container.
.PARAMETER Service
  Docker service name to roll back (default: app).
#>

param(
  [string]$Service = "app"
)

$composeFile = "docker-compose.yml"
if (Test-Path "telegram-dashboard-backend/docker-compose.yml") {
  Push-Location "telegram-dashboard-backend"
  $composeFile = "docker-compose.yml"
}

Write-Host "Rolling back service: $Service" -ForegroundColor Cyan

$images = & docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -match "^${Service}:" } | Sort-Object -Descending
if ($images.Count -lt 2) {
  Write-Host "Only one image for $Service, cannot roll back." -ForegroundColor Red
  exit 1
}

$currentImage = $images[0]
$previousImage = $images[1]
Write-Host "Current: $currentImage" -ForegroundColor Yellow
Write-Host "Target:  $previousImage" -ForegroundColor Green

$confirm = Read-Host "Roll back to $previousImage? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
  Write-Host "Aborted." -ForegroundColor Gray
  exit 1
}

& docker tag $previousImage "${Service}:current"
& docker compose up -d --no-deps $Service

Write-Host "`nChecking health..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
$health = & docker ps --filter "name=${Service}" --format "{{.Status}}"
Write-Host "Status: $health" -ForegroundColor Green
Write-Host "Rollback completed." -ForegroundColor Green
Pop-Location
