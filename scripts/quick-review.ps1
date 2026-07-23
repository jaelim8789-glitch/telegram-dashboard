<#
.SYNOPSIS
  Quick review: diff stat, file names, change counts.
#>

$headBase = "origin/master"
$mergeBase = & git merge-base HEAD $headBase 2>$null
if (-not $mergeBase) {
  $headBase = "master"
  $mergeBase = & git merge-base HEAD $headBase 2>$null
}

Write-Host "===== Quick Review =====" -ForegroundColor Cyan
Write-Host "Base: $headBase" -ForegroundColor Gray
Write-Host "HEAD: $(& git rev-parse --short HEAD)" -ForegroundColor Gray

$diffStats = & git diff "$mergeBase...HEAD" --stat
$changedFiles = & git diff "$mergeBase...HEAD" --name-only

$newFiles = @($changedFiles | Where-Object { $_ -match "^" })
$modifiedCount = ($diffStats | Measure-Object -Line).Lines

Write-Host "`nDiff --stat:" -ForegroundColor Cyan
$diffStats | ForEach-Object { Write-Host "  $_" }

Write-Host "`nChanged files ($($changedFiles.Count)):" -ForegroundColor Cyan
$changedFiles | ForEach-Object { Write-Host "  $_" }

$insertions = 0
$deletions = 0
foreach ($line in $diffStats) {
  if ($line -match "(\d+) insertion") { $insertions += [int]$matches[1] }
  if ($line -match "(\d+) deletion") { $deletions += [int]$matches[1] }
}

Write-Host "`nSummary:" -ForegroundColor Green
Write-Host "  Files changed: $($changedFiles.Count)" -ForegroundColor White
Write-Host "  Insertions:    $insertions" -ForegroundColor Green
Write-Host "  Deletions:     $deletions" -ForegroundColor Red
