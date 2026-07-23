<#
.SYNOPSIS
  Run next build and only output errors (filter out success noise).
#>

$output = & npm run build 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
  Write-Host "BUILD PASSED" -ForegroundColor Green
} else {
  Write-Host "BUILD FAILED (exit $exitCode)" -ForegroundColor Red
  Write-Host "`n--- Errors ---" -ForegroundColor Yellow
  foreach ($line in $output) {
    if ($line -match "error|Error|ERROR|FAIL|Failed|Module not found|Cannot find module") {
      Write-Host "  $line" -ForegroundColor Red
    }
  }
  $errorLines = $output | Where-Object { $_ -match "error|Error|ERROR" }
  if ($errorLines) {
    Write-Host "`nTotal error lines: $($errorLines.Count)" -ForegroundColor Gray
  }
}
exit $exitCode
