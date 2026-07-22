<#
.SYNOPSIS
  Find exports defined but never imported in other files.
.DESCRIPTION
  Uses rg to scan for exported functions/consts that have no import references.
#>

$tsFiles = Get-ChildItem -Recurse -Filter "*.ts" -Include "*.ts", "*.tsx" -Exclude "*.test.*", "*.spec.*", "node_modules", ".next"
$exportPattern = '^\s*export\s+(function|const|class|interface|type|enum)\s+(\w+)'
$deadCode = @{}

foreach ($file in $tsFiles) {
  $content = Get-Content $file.FullName -Raw
  $matches = [regex]::Matches($content, $exportPattern, 'Multiline')
  foreach ($m in $matches) {
    $name = $m.Groups[2].Value
    $searchPattern = "(?:from\s+['\""]|import\s+.*\b$name\b)"
    $references = & rg -l $searchPattern --include "*.ts" --include "*.tsx" --glob "!node_modules" 2>$null
    $refCount = ($references | Where-Object { $_ -ne $file.FullName }).Count
    if ($refCount -eq 0) {
      $deadCode[$name] = $file.FullName
    }
  }
}

if ($deadCode.Count -eq 0) {
  Write-Host "No dead exports found (or rg not available)." -ForegroundColor Green
  exit 0
}

Write-Host "Potentially dead exports ($($deadCode.Count)):" -ForegroundColor Yellow
$deadCode.GetEnumerator() | Sort-Object Name | ForEach-Object {
  Write-Host "  $($_.Key) -> $($_.Value)"
}
