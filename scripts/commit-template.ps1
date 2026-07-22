<#
.SYNOPSIS
  Generate conventional commit message based on git diff --stat and staged files.
#>

$staged = & git diff --cached --name-only
$diffStats = & git diff --cached --stat
$lines = $staged -split "`n"
$types = $lines | ForEach-Object {
  if ($_ -match "\.tsx?$") { "refactor" }
  elseif ($_ -match "\.py$") { "feat" }
  elseif ($_ -match "\.(css|scss)$") { "style" }
  elseif ($_ -match "\.(md|yml|yaml|json)$") { "docs" }
  elseif ($_ -match "\.(test|spec|cy)\.(ts|tsx)$") { "test" }
  elseif ($_ -match "docker|Dockerfile") { "ci" }
  else { "chore" }
}
$primaryType = $types | Group-Object | Sort-Object Count -Descending | Select-Object -First 1 -ExpandProperty Name

$fileCount = $lines.Count
$scope = if ($lines[0] -match "^(\w+)/") { $matches[1] } else { "app" }

$insertions = 0
$deletions = 0
foreach ($line in $diffStats) {
  if ($line -match "(\d+) insertion") { $insertions += [int]$matches[1] }
  if ($line -match "(\d+) deletion") { $deletions += [int]$matches[1] }
}

$description = $lines[0] -replace "^.*[\\/]", "" -replace "\.(ts|tsx|py)$", ""
$summary = "$primaryType($scope): update $description ($fileCount files, +$insertions/-$deletions)"

Write-Host "Suggested commit message:" -ForegroundColor Cyan
Write-Host "  $summary" -ForegroundColor Green
Write-Host "`nStaged files:" -ForegroundColor Gray
$lines | ForEach-Object { Write-Host "  $_" }
