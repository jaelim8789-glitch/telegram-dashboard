<#
.SYNOPSIS
  Quick switch between branches with auto-stash/restore.
.PARAMETER Branch
  Target branch name to switch to.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Branch
)

$currentBranch = & git rev-parse --abbrev-ref HEAD
if ($currentBranch -eq $Branch) {
  Write-Host "Already on branch '$Branch'." -ForegroundColor Yellow
  exit 0
}

$dirty = & git status --porcelain
$stashRef = $null

if ($dirty) {
  Write-Host "Dirty working tree. Stashing..." -ForegroundColor Yellow
  & git stash push -u -m "auto-stash before switch to $Branch"
  $stashRef = "stash@{0}"
  Write-Host "Stashed as $stashRef" -ForegroundColor Cyan
}

& git checkout $Branch
if ($LASTEXITCODE -eq 0) {
  Write-Host "Switched to '$Branch'" -ForegroundColor Green
} else {
  Write-Host "Failed to switch to '$Branch'" -ForegroundColor Red
  if ($stashRef) {
    Write-Host "Stashed changes remain: $stashRef" -ForegroundColor Yellow
  }
  exit 1
}

if ($stashRef) {
  $apply = Read-Host "Restore stashed changes? (Y/n)"
  if ($apply -ne 'n' -and $apply -ne 'N') {
    & git stash pop
    Write-Host "Stashed changes restored." -ForegroundColor Green
  }
}
