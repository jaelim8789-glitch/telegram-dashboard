<#
.SYNOPSIS
  PR checklist: git status, log, build, tsc. Report pass/fail.
#>

Write-Host "===== PR PREP CHECKLIST =====" -ForegroundColor Cyan
$allPassed = $true

Write-Host "`n[1/4] Git Status:" -ForegroundColor Cyan
$status = & git status --short
if ($status) {
  Write-Host "  Uncommitted changes found:" -ForegroundColor Yellow
  $status | ForEach-Object { Write-Host "    $_" }
  $allPassed = $false
} else {
  Write-Host "  Clean working directory" -ForegroundColor Green
}

Write-Host "`n[2/4] Recent commits:" -ForegroundColor Cyan
$log = & git log --oneline -5
$log | ForEach-Object { Write-Host "  $_" }

Write-Host "`n[3/4] npm run build..." -ForegroundColor Cyan
$build = & npm run build 2>&1
$buildExit = $LASTEXITCODE
if ($buildExit -eq 0) {
  Write-Host "  Build PASSED" -ForegroundColor Green
} else {
  Write-Host "  Build FAILED" -ForegroundColor Red
  $allPassed = $false
}

Write-Host "`n[4/4] npx tsc --noEmit..." -ForegroundColor Cyan
$tsc = & npx tsc --noEmit 2>&1
$tscExit = $LASTEXITCODE
if ($tscExit -eq 0) {
  Write-Host "  TSC PASSED" -ForegroundColor Green
} else {
  Write-Host "  TSC FAILED" -ForegroundColor Red
  $allPassed = $false
}

Write-Host "`n===== OVERALL =====" -ForegroundColor Cyan
if ($allPassed) {
  Write-Host "ALL CHECKS PASSED - Ready for PR!" -ForegroundColor Green
} else {
  Write-Host "SOME CHECKS FAILED - Fix issues before PR" -ForegroundColor Red
}
exit $(if ($allPassed) { 0 } else { 1 })
