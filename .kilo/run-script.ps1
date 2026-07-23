# Run script for TeleMon worktrees
# Starts Next.js dev server
param(
    [string]$WORKTREE_PATH = $PSScriptRoot,
    [string]$REPO_PATH = "C:\Backups\emergency-20260718-211528\Dev\TeleMon"
)

$port = 3000 + (Get-Random -Minimum 0 -Maximum 1000)
Write-Host "=== TeleMon Dev Server ==="
Write-Host "Port: $port"
Write-Host "Worktree: $WORKTREE_PATH"

Set-Location $WORKTREE_PATH
npx next dev --turbo -p $port
