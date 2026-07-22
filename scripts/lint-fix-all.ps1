<#
.SYNOPSIS
  Run npx eslint . --fix and report file count fixed.
#>

$output = & npx eslint . --fix 2>&1
$exitCode = $LASTEXITCODE
$fixedCount = 0
$fileCount = 0

foreach ($line in $output) {
  if ($line -match "^\S+\.(ts|tsx|js|jsx)\s") { $fileCount++ }
  if ($line -match "fixed") { $fixedCount = [int]($line -replace '\D', '') }
}

Write-Host "ESLint completed with exit code $exitCode" -ForegroundColor Cyan
Write-Host "Files checked: $fileCount" -ForegroundColor Cyan

if ($fixedCount -gt 0) {
  Write-Host "Auto-fixed: $fixedCount issue(s)" -ForegroundColor Green
}
exit $exitCode
