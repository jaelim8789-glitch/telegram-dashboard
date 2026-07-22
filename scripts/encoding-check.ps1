<#
.SYNOPSIS
  Check all .ts, .tsx, .py files for UTF-16 encoding (bad!).
#>

$badFiles = @()
$extensions = @("*.ts", "*.tsx", "*.py")
$searchPaths = @("src", "telegram-dashboard-backend")

foreach ($ext in $extensions) {
  foreach ($base in $searchPaths) {
    if (Test-Path $base) {
      $files = Get-ChildItem -Recurse -Filter $ext -Path $base -ErrorAction SilentlyContinue
      foreach ($f in $files) {
        try {
          $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
          if ($bytes.Length -ge 2) {
            if (($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) -or ($bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF)) {
              $badFiles += $f.FullName
            }
            if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { }
          }
        } catch {
          Write-Host "  Could not read $($f.FullName): $_" -ForegroundColor DarkGray
        }
      }
    }
  }
}

if ($badFiles.Count -eq 0) {
  Write-Host "Encoding check PASSED: No UTF-16 files found." -ForegroundColor Green
} else {
  Write-Host "Encoding check FAILED - UTF-16 files found ($($badFiles.Count)):" -ForegroundColor Red
  foreach ($f in $badFiles) {
    Write-Host "  $f" -ForegroundColor Yellow
  }
  exit 1
}
