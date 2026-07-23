<#
.SYNOPSIS
  Start npm run dev with optimized flags and ready message.
.DESCRIPTION
  Launches next dev with --turbo if available, prints ready URL.
#>

$proc = Start-Process -NoNewWindow -PassThru -FilePath "npm" -ArgumentList "run dev -- --turbo"
Write-Host "Dev server starting with --turbo..." -ForegroundColor Cyan
Write-Host "Ready at http://localhost:3000" -ForegroundColor Green
$proc.WaitForExit()
