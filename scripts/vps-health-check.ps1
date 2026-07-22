<#
.SYNOPSIS
  SSH to VPS and check: docker ps, disk space, memory, last deploy time.
.PARAMETER Host
  VPS hostname or IP (default: 130.94.32.152).
#>

param(
  [string]$Host = "130.94.32.152"
)

$checks = @(
  "echo '=== Docker Status ===' && docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'",
  "echo '`n=== Disk Usage ===' && df -h / | tail -1",
  "echo '`n=== Memory ===' && free -h | head -2",
  "echo '`n=== Uptime ===' && uptime",
  "echo '`n=== Last Deploy ===' && ls -la /opt/telemon/backend/.deploy-timestamp 2>/dev/null || echo 'No deploy timestamp found'"
)

$fullCommand = $checks -join " && "

Write-Host "Connecting to $Host..." -ForegroundColor Cyan
ssh "root@$Host" $fullCommand

if ($LASTEXITCODE -eq 0) {
  Write-Host "`nHealth check completed." -ForegroundColor Green
} else {
  Write-Host "`nHealth check failed (exit $LASTEXITCODE)." -ForegroundColor Red
}
