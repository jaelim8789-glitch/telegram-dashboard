#!/usr/bin/env pwsh
# Clean temporary files script

Write-Host "Cleaning temporary files..." -ForegroundColor Cyan

# Count total files to be removed
$totalFiles = 0

# Remove .db files
$dbFiles = Get-ChildItem -Path "." -Recurse -Include "*.db" -File -ErrorAction SilentlyContinue
if ($dbFiles) {
    Write-Host "`nRemoving .db files:" -ForegroundColor Yellow
    foreach ($file in $dbFiles) {
        Write-Host "  - $($file.FullName)"
        Remove-Item $file.FullName -Force
    }
    $totalFiles += $dbFiles.Count
}

# Remove tmp_* files
$tmpFiles = Get-ChildItem -Path "." -Recurse -Include "tmp_*" -File -ErrorAction SilentlyContinue
if ($tmpFiles) {
    Write-Host "`nRemoving tmp_* files:" -ForegroundColor Yellow
    foreach ($file in $tmpFiles) {
        Write-Host "  - $($file.FullName)"
        Remove-Item $file.FullName -Force
    }
    $totalFiles += $tmpFiles.Count
}

# Remove tsc_*.txt files
$tscFiles = Get-ChildItem -Path "." -Recurse -Include "tsc_*.txt" -File -ErrorAction SilentlyContinue
if ($tscFiles) {
    Write-Host "`nRemoving tsc_*.txt files:" -ForegroundColor Yellow
    foreach ($file in $tscFiles) {
        Write-Host "  - $($file.FullName)"
        Remove-Item $file.FullName -Force
    }
    $totalFiles += $tscFiles.Count
}

# Remove dev_out*.txt files
$devOutFiles = Get-ChildItem -Path "." -Recurse -Include "dev_out*.txt" -File -ErrorAction SilentlyContinue
if ($devOutFiles) {
    Write-Host "`nRemoving dev_out*.txt files:" -ForegroundColor Yellow
    foreach ($file in $devOutFiles) {
        Write-Host "  - $($file.FullName)"
        Remove-Item $file.FullName -Force
    }
    $totalFiles += $devOutFiles.Count
}

# Remove master_result*.txt files
$masterResultFiles = Get-ChildItem -Path "." -Recurse -Include "master_result*.txt" -File -ErrorAction SilentlyContinue
if ($masterResultFiles) {
    Write-Host "`nRemoving master_result*.txt files:" -ForegroundColor Yellow
    foreach ($file in $masterResultFiles) {
        Write-Host "  - $($file.FullName)"
        Remove-Item $file.FullName -Force
    }
    $totalFiles += $masterResultFiles.Count
}

# Remove specific temp files
$specificFiles = @("null", "nul", "query", "git_log.txt")
foreach ($fileName in $specificFiles) {
    $files = Get-ChildItem -Path "." -Recurse -Include $fileName -File -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "`nRemoving $fileName files:" -ForegroundColor Yellow
        foreach ($file in $files) {
            Write-Host "  - $($file.FullName)"
            Remove-Item $file.FullName -Force
        }
        $totalFiles += $files.Count
    }
}

Write-Host "`n✅ Total temporary files removed: $totalFiles" -ForegroundColor Green
Write-Host "Cleanup completed." -ForegroundColor Cyan