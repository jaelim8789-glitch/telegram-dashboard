<#
.SYNOPSIS
  Check API route files for common patterns (response schemas, error handling).
#>

$apiFiles = Get-ChildItem -Recurse -Filter "*.py" -Path "telegram-dashboard-backend" -ErrorAction SilentlyContinue
if (-not $apiFiles) {
  $apiFiles = Get-ChildItem -Recurse -Filter "*.ts" -Path "src/app/api" -ErrorAction SilentlyContinue
}

$results = @()
foreach ($file in $apiFiles) {
  $content = Get-Content $file.FullName -Raw
  $issues = @()
  $name = $file.FullName

  if ($content -notmatch "except") { $issues += "No try/except error handling" }
  if ($content -match "response_model\s*=" -and $content -notmatch "from pydantic") { $issues += "Uses response_model but no pydantic import" }
  if ($content -match "def (get|post|put|delete|patch)\b" -and $content -notmatch "async def") {
    if ($content -match "httpx|aiohttp|asyncio|await") { $issues += "Sync handler with async operations" }
  }
  if ($content -notmatch "\b404\b|\b400\b|\b422\b|\b500\b") { $issues += "No explicit error status codes" }
  if ($content -match "return\s+[^#]*\b(response|jsonify|JSONResponse)" -and $content -notmatch "response_model") { $issues += "Returns response but no response_model annotation" }

  if ($issues.Count -gt 0) {
    $results += @{ File = $name; Issues = $issues }
  }
}

Write-Host "API route check results:" -ForegroundColor Cyan
if ($results.Count -eq 0) {
  Write-Host "  All routes look good!" -ForegroundColor Green
} else {
  foreach ($r in $results) {
    Write-Host "`n$($r.File)" -ForegroundColor Yellow
    foreach ($issue in $r.Issues) {
      Write-Host "  - $issue"
    }
  }
}
