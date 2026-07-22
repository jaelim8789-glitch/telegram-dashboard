<#
.SYNOPSIS
  Safely roll back the last N commits (default 1).
.PARAMETER Count
  Number of commits to roll back (default 1).
#>

param(
  [int]$Count = 1
)

$status = & git status --porcelain
if ($status) {
  Write-Host "Working directory is dirty. Stash or commit before rollback." -ForegroundColor Red
  exit 1
}

$recentLog = & git log --oneline -($Count + 1)
$logLines = $recentLog -split "`n"
if ($logLines.Count -lt ($Count + 1)) {
  Write-Host "Only $($logLines.Count) commits exist, cannot roll back $Count." -ForegroundColor Red
  exit 1
}

Write-Host "Commits to roll back:" -ForegroundColor Yellow
for ($i = 0; $i -lt $Count; $i++) {
  Write-Host "  $($logLines[$i])"
}
Write-Host "`nTarget commit (will become HEAD):" -ForegroundColor Cyan
Write-Host "  $($logLines[$Count])"

$confirm = Read-Host "`nRoll back $Count commit(s) with --soft? (y/N)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
  & git reset --soft "HEAD~$Count"
  Write-Host "Rolled back $Count commit(s) with --soft. Changes are staged." -ForegroundColor Green
} else {
  Write-Host "Aborted." -ForegroundColor Gray
}
