<#
.SYNOPSIS
  Run pnpm outdated --format json and show outdated packages table.
#>

$output = & pnpm outdated --format json 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0 -or $output -match '"changed"|"current"|"latest"') {
  try {
    $data = $output | ConvertFrom-Json
    if ($data.PSObject.Properties.Count -eq 0) {
      Write-Host "All packages are up-to-date!" -ForegroundColor Green
      exit 0
    }
    Write-Host ("{0,-35} {1,-15} {2,-15} {3,-15}" -f "Package", "Current", "Wanted", "Latest") -ForegroundColor Cyan
    Write-Host ("-" * 85) -ForegroundColor Gray
    $data.PSObject.Properties | Sort-Object Name | ForEach-Object {
      $name = $_.Name
      $info = $_.Value
      Write-Host ("{0,-35} {1,-15} {2,-15} {3,-15}" -f $name, $info.current, $info.wanted, $info.latest)
    }
  } catch {
    Write-Host "Could not parse pnpm outdated output. Raw:" -ForegroundColor Yellow
    $output
  }
} else {
  Write-Host "pnpm outdated failed or all packages up-to-date." -ForegroundColor Green
}
