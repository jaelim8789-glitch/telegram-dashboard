<#
.SYNOPSIS
  List all git worktrees with branch, status, ahead/behind count.
#>

$worktrees = & git worktree list --porcelain
$currentPath = ""
$branches = @{}

foreach ($line in $worktrees) {
  if ($line -match "^worktree (.+)") {
    $currentPath = $matches[1]
  } elseif ($line -match "^branch refs/heads/(.+)") {
    $branches[$currentPath] = @{ Branch = $matches[1] }
  } elseif ($line -match "^detached") {
    $branches[$currentPath] = @{ Branch = "(detached)" }
  }
}

Write-Host ("{0,-50} {1,-25} {2,-15} {3}" -f "Worktree Path", "Branch", "Status", "Ahead/Behind") -ForegroundColor Cyan
Write-Host ("-" * 100) -ForegroundColor Gray

foreach ($path in $branches.Keys | Sort-Object) {
  $info = $branches[$path]
  $branch = $info.Branch

  Push-Location $path
  $status = (& git status --porcelain) ? "DIRTY" : "CLEAN"

  $aheadBehind = ""
  $remoteOutput = & git rev-list --left-right --count "origin/$branch...$branch" 2>$null
  if ($remoteOutput -match "^(\d+)\s+(\d+)$") {
    $behind = [int]$matches[1]
    $ahead = [int]$matches[2]
    if ($ahead -gt 0 -or $behind -gt 0) {
      $aheadBehind = "+$ahead / -$behind"
    } else {
      $aheadBehind = "synced"
    }
  }
  Pop-Location

  $statusColor = if ($status -eq "DIRTY") { "Yellow" } else { "Green" }
  Write-Host ("{0,-50} {1,-25} " -f $path, $branch) -NoNewline
  Write-Host ("{0,-15} " -f $status) -ForegroundColor $statusColor -NoNewline
  Write-Host $aheadBehind
}
