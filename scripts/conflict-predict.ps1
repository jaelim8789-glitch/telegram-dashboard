<#
.SYNOPSIS
  Find files modified in multiple active branches that may conflict.
#>

$branches = & git branch | ForEach-Object { $_.Trim() -replace "^\* ", "" } | Where-Object { $_ -ne "master" -and $_ -ne "main" }
$masterFiles = & git ls-tree -r master --name-only | ForEach-Object { $_.Trim() }
$fileBranchMap = @{}

foreach ($branch in $branches) {
  $files = & git diff --name-only "master...$branch" 2>$null
  foreach ($f in $files) {
    $f = $f.Trim()
    if (-not $fileBranchMap.ContainsKey($f)) {
      $fileBranchMap[$f] = @()
    }
    $fileBranchMap[$f] += $branch
  }
}

$conflicts = @{}
foreach ($kv in $fileBranchMap.GetEnumerator()) {
  if ($kv.Value.Count -ge 2) {
    $conflicts[$kv.Key] = $kv.Value
  }
}

if ($conflicts.Count -eq 0) {
  Write-Host "No predicted conflicts detected." -ForegroundColor Green
  exit 0
}

Write-Host "Potential conflicts ($($conflicts.Count) files):" -ForegroundColor Yellow
$sorted = $conflicts.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending
foreach ($entry in $sorted) {
  Write-Host "`n  $($entry.Key)" -ForegroundColor Cyan
  foreach ($b in $entry.Value) {
    Write-Host "    <- $b"
  }
}
