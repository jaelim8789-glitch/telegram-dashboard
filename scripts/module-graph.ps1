<#
.SYNOPSIS
  Generate import graph, output top 10 most-imported modules.
.DESCRIPTION
  Uses madge or grep-based fallback to find most-imported modules.
#>

$hasMadge = $null -ne (Get-Command "madge" -ErrorAction SilentlyContinue)
$srcDir = "src"

if ($hasMadge) {
  Write-Host "Using madge to analyze imports..." -ForegroundColor Cyan
  $output = & npx madge --json $srcDir 2>&1
  try {
    $graph = $output | ConvertFrom-Json
    $importCount = @{}
    $graph.PSObject.Properties | ForEach-Object {
      $imports = $_.Value
      foreach ($imp in $imports) {
        $key = $imp -replace "^\.\.?/", "" -replace "/index$", ""
        if (-not $importCount.ContainsKey($key)) { $importCount[$key] = 0 }
        $importCount[$key]++
      }
    }
    Write-Host "`nTop 10 most-imported modules:" -ForegroundColor Cyan
    $importCount.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object {
      Write-Host "  $($_.Key) ($($_.Value) imports)"
    }
  } catch {
    Write-Host "madge output parse failed, falling back to grep..." -ForegroundColor Yellow
    $hasMadge = $false
  }
}

if (-not $hasMadge) {
  $tsFiles = Get-ChildItem -Recurse -Filter "*.ts" -Path $srcDir -Exclude "*.test.*", "*.spec.*" -ErrorAction SilentlyContinue
  $importCount = @{}
  foreach ($f in $tsFiles) {
    $content = Get-Content $f.FullName -Raw
    $imports = [regex]::Matches($content, 'from\s+["'']([^"'']+)["'']')
    foreach ($m in $imports) {
      $path = $m.Groups[1].Value
      if ($path -match "^\.\.?/") {
        $resolved = [System.IO.Path]::GetFullPath((Join-Path $f.DirectoryName $path))
        $rel = $resolved -replace [regex]::Escape((Resolve-Path $srcDir).Path), ""
        $rel = $rel -replace "^\\", "" -replace "\\", "/" -replace "/index$", ""
        if ($rel) {
          if (-not $importCount.ContainsKey($rel)) { $importCount[$rel] = 0 }
          $importCount[$rel]++
        }
      }
    }
  }
  Write-Host "`nTop 10 most-imported modules (grep-based):" -ForegroundColor Cyan
  $importCount.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Key) ($($_.Value) imports)"
  }
}
