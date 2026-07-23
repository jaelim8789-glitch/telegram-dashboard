<#
.SYNOPSIS
  Delete remote branches already merged into origin/master.
#>

$merged = & git branch -r --merged origin/master
$toDelete = @()

foreach ($branch in $merged) {
  $trimmed = $branch.Trim()
  if ($trimmed -match "^origin/(?!master$|main$|release|worktree/)(.+)$") {
    $toDelete += $trimmed
  }
}

if ($toDelete.Count -eq 0) {
  Write-Host "No remote branches to clean up." -ForegroundColor Green
  exit 0
}

Write-Host "Branches to delete:" -ForegroundColor Yellow
$toDelete | ForEach-Object { Write-Host "  $_" }

$confirm = Read-Host "`nDelete these $($toDelete.Count) remote branches? (y/N)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
  foreach ($branch in $toDelete) {
    $localName = $branch -replace "^origin/", ""
    Write-Host "  Deleting $branch..." -ForegroundColor Cyan
    & git push origin --delete $localName 2>$null
  }
  Write-Host "Done." -ForegroundColor Green
} else {
  Write-Host "Aborted." -ForegroundColor Gray
}
