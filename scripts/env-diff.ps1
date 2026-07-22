<#
.SYNOPSIS
  Compare .env.example with .env, report missing keys.
#>

$examplePath = ".env.example"
$envPath = ".env"

if (-not (Test-Path $examplePath)) {
  Write-Host "$examplePath not found." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $envPath)) {
  Write-Host "$envPath not found." -ForegroundColor Yellow
  exit 1
}

$exampleKeys = @()
Get-Content $examplePath | ForEach-Object {
  if ($_ -match "^\s*([A-Z_][A-Z0-9_]*)\s*=") {
    $exampleKeys += $matches[1]
  }
}

$envKeys = @()
Get-Content $envPath | ForEach-Object {
  if ($_ -match "^\s*([A-Z_][A-Z0-9_]*)\s*=") {
    $envKeys += $matches[1]
  }
}

$missing = $exampleKeys | Where-Object { $_ -notin $envKeys }
$extra = $envKeys | Where-Object { $_ -notin $exampleKeys }

Write-Host "Environment comparison:" -ForegroundColor Cyan
Write-Host "  .env.example keys: $($exampleKeys.Count)"
Write-Host "  .env keys: $($envKeys.Count)"

if ($missing.Count -gt 0) {
  Write-Host "`nMissing from .env ($($missing.Count)):" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  $_" }
}

if ($extra.Count -gt 0) {
  Write-Host "`nExtra in .env not in .env.example ($($extra.Count)):" -ForegroundColor Yellow
  $extra | ForEach-Object { Write-Host "  $_" }
}

if ($missing.Count -eq 0 -and $extra.Count -eq 0) {
  Write-Host "`n.env is in sync with .env.example" -ForegroundColor Green
}
