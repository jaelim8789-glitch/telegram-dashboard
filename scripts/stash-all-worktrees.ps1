<#
.SYNOPSIS
  Stash all dirty git worktrees.
#>

$worktrees = & git worktree list --porcelain
$paths = @()

foreach ($line in $worktrees) {
  if ($line -match "^worktree (.+)") {
    $paths += $matches[1]
  }
}

$stashed = 0
foreach ($path in $paths | Sort-Object) {
  Push-Location $path
  $status = & git status --porcelain
  if ($status) {
    Write-Host "Stashing $path..." -ForegroundColor Yellow
    & git stash push -m "auto-stash $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    $stashed++
  } else {
    Write-Host "Clean: $path" -ForegroundColor Green
  }
  Pop-Location
}
Write-Host "`nStashed $stashed worktree(s)." -ForegroundColor Cyan
