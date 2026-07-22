<#
.SYNOPSIS
  Docker system prune --volumes with confirmation.
#>

Write-Host "WARNING: This will remove:" -ForegroundColor Yellow
Write-Host "  - All stopped containers" -ForegroundColor Yellow
Write-Host "  - All unused networks" -ForegroundColor Yellow
Write-Host "  - All dangling images" -ForegroundColor Yellow
Write-Host "  - All unused volumes" -ForegroundColor Red

$confirm = Read-Host "`nAre you sure? Type 'prune' to confirm"
if ($confirm -eq 'prune') {
  Write-Host "Running docker system prune -f --volumes..." -ForegroundColor Cyan
  & docker system prune -f --volumes
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker cleanup completed." -ForegroundColor Green
  } else {
    Write-Host "Docker cleanup encountered issues." -ForegroundColor Red
  }
} else {
  Write-Host "Aborted." -ForegroundColor Gray
}
