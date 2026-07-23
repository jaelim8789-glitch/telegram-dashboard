<#
.SYNOPSIS
  Generate OpenAPI types and show git diff --stat.
.DESCRIPTION
  Runs npm run typegen if it exists in package.json, otherwise npx openapi-typescript.
  Then shows git diff --stat for generated type files.
#>

$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$hasTypegen = $pkg.scripts.typegen -ne $null

if ($hasTypegen) {
  Write-Host "Running npm run typegen..." -ForegroundColor Cyan
  & npm run typegen
} else {
  Write-Host "No typegen script found, checking for openapi-typescript..." -ForegroundColor Yellow
  $specPath = "telegram-dashboard-backend/openapi.json"
  if (Test-Path $specPath) {
    & npx openapi-typescript $specPath -o src/lib/api/generated.ts
  } else {
    $specs = Get-ChildItem -Filter "openapi*" -Recurse -Depth 2
    if ($specs.Count -gt 0) {
      & npx openapi-typescript $specs[0].FullName -o src/lib/api/generated.ts
    } else {
      Write-Host "No OpenAPI spec found. Skipping typegen." -ForegroundColor Red
      exit 1
    }
  }
}

Write-Host "`nGit diff --stat for generated types:" -ForegroundColor Green
$diffOutput = & git diff --stat -- "*.ts"
if ($diffOutput) {
  $diffOutput | ForEach-Object { Write-Host "  $_" }
} else {
  Write-Host "  No changes to type files." -ForegroundColor Gray
}
