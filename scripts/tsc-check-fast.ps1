<#
.SYNOPSIS
  Run npx tsc --noEmit, count errors, output summary.
#>

$output = & npx tsc --noEmit 2>&1
$exitCode = $LASTEXITCODE
$errorCount = 0
$fileErrors = @{}

foreach ($line in $output) {
  if ($line -match "error TS\d+:" -or $line -match "^\S+\.tsx?\(\d+,\d+\): error") {
    $errorCount++
    if ($line -match "^(\S+?\.tsx?)") {
      $file = $matches[1]
      $fileErrors[$file] = ($fileErrors[$file] ?? 0) + 1
    }
  }
}

if ($exitCode -eq 0) {
  Write-Host "TSC PASSED - No errors" -ForegroundColor Green
} else {
  Write-Host "TSC FAILED - $errorCount error(s)" -ForegroundColor Red
  if ($fileErrors.Count -gt 0) {
    Write-Host "Files with errors:" -ForegroundColor Yellow
    $fileErrors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object {
      Write-Host "  $($_.Key): $($_.Value) error(s)"
    }
  }
}
exit $exitCode
