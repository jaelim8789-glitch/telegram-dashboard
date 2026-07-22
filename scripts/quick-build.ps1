<#
.SYNOPSIS
  Run npm run build and report pass/fail with first error line.
.DESCRIPTION
  Captures build output, exit code. Prints "BUILD PASSED" or the first error line.
#>

$output = & npm run build 2>&1
$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
  Write-Host "BUILD PASSED" -ForegroundColor Green
} else {
  Write-Host "BUILD FAILED (exit $exitCode)" -ForegroundColor Red
  foreach ($line in $output) {
    if ($line -match "error") {
      Write-Host "  First error: $line" -ForegroundColor Yellow
      break
    }
  }
}
exit $exitCode
