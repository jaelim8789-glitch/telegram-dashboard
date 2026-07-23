<#
.SYNOPSIS
  Pull all git worktrees with git pull --rebase.
#>

$worktrees = & git worktree list --porcelain
$paths = @()

foreach ($line in $worktrees) {
  if ($line -match "^worktree (.+)") {
    $paths += $matches[1]
  }
}

foreach ($path in $paths | Sort-Object) {
  Write-Host "`n>>> Pulling $path..." -ForegroundColor Cyan
  Push-Location $path
  & git pull --rebase
  Pop-Location
}
Write-Host "`nAll worktrees synced." -ForegroundColor Green
