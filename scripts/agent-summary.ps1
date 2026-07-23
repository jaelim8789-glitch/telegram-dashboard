<#
.SYNOPSIS
  Show .kilo/agent/ directory listing with descriptions.
#>

$agentDir = ".kilo/agent"
if (-not (Test-Path $agentDir)) {
  Write-Host ".kilo/agent/ directory not found." -ForegroundColor Yellow
  exit 0
}

$files = Get-ChildItem -Path $agentDir -File
Write-Host ".kilo/agent/ contents:" -ForegroundColor Cyan
Write-Host ("{0,-35} {1,-15} {2}" -f "Name", "Size (KB)", "Description") -ForegroundColor Gray
Write-Host ("-" * 100) -ForegroundColor Gray

foreach ($f in $files) {
  $sizeKB = [math]::Round($f.Length / 1KB, 1)
  $desc = ""
  $content = Get-Content $f.FullName -TotalCount 3 -ErrorAction SilentlyContinue
  foreach ($line in $content) {
    if ($line -match "^#\s*(.+)") {
      $desc = $matches[1].Trim()
      if ($desc -ne "Agent" -and $desc -ne $f.Name) { break }
    }
    if ($line -match "description:\s*(.+)") {
      $desc = $matches[1].Trim()
      break
    }
  }
  Write-Host ("{0,-35} {1,-15} {2}" -f $f.Name, $sizeKB, $desc)
}

$subdirs = Get-ChildItem -Path $agentDir -Directory
foreach ($d in $subdirs) {
  Write-Host ("{0,-35} (dir)" -f "$($d.Name)/") -ForegroundColor Cyan
}
