<#
.SYNOPSIS
  Output project tree structure (dirs only, max depth 3).
.PARAMETER MaxDepth
  Maximum directory depth (default 3).
#>

param(
  [int]$MaxDepth = 3
)

$root = Resolve-Path "."
$exclude = @("node_modules", ".next", ".git", ".worktrees", "__pycache__", ".venv", "venv")

function Show-Tree {
  param([string]$Path, [int]$Depth = 0)
  if ($Depth -gt $MaxDepth) { return }
  $indent = "  " * $Depth
  $dirName = Split-Path $Path -Leaf
  if ($Depth -eq 0) { $dirName = $root }
  Write-Host "$indent$dirName/" -ForegroundColor Cyan
  $subdirs = Get-ChildItem -Directory -Path $Path -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin $exclude }
  foreach ($d in $subdirs) {
    Show-Tree -Path $d.FullName -Depth ($Depth + 1)
  }
}

Write-Host "Project tree (max depth $MaxDepth):" -ForegroundColor Cyan
Show-Tree -Path $root -Depth 0
