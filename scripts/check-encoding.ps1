#!/usr/bin/env pwsh
# scripts/check-encoding.ps1
# Scans .ts/.tsx/.js/.jsx files in src/ for non-UTF-8 files
# Usage: ./scripts/check-encoding.ps1 [-Fix]
param([switch]$Fix)

$script:exitCode = 0
$bad = @()

Write-Host "🔍 Scanning src/ for non-UTF-8 encoded files..." -ForegroundColor Yellow

Get-ChildItem -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" -LiteralPath "src" -File | ForEach-Object {
  $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
  if ($bytes.Length -ge 2) {
    $isUtf16 = ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) -or ($bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF)
    if ($isUtf16) {
      $bad += $_.FullName
      Write-Host "  ✗ $($_.FullName)" -ForegroundColor Red
    }
  }
}

if ($bad.Count -eq 0) {
  Write-Host "✅ All source files are UTF-8 encoded." -ForegroundColor Green
  exit 0
}

Write-Host "❌ Found $($bad.Count) file(s) with UTF-16 encoding." -ForegroundColor Red

if ($Fix) {
  Write-Host "🔄 Converting to UTF-8..." -ForegroundColor Yellow
  foreach ($f in $bad) {
    $bytes = [System.IO.File]::ReadAllBytes($f)
    if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
      $enc = [System.Text.Encoding]::Unicode
    } else {
      $enc = [System.Text.Encoding]::BigEndianUnicode
    }
    $content = $enc.GetString($bytes)
    [System.IO.File]::WriteAllText($f, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  ✓ $f converted" -ForegroundColor Green
  }
  Write-Host "✅ Conversion complete." -ForegroundColor Green
} else {
  Write-Host "💡 To convert, run: ./scripts/check-encoding.ps1 -Fix" -ForegroundColor Yellow
}

exit 1
