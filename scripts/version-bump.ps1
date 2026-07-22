<#
.SYNOPSIS
  Bump package.json version (patch/minor/major), create git commit.
.PARAMETER Type
  bump type: patch, minor, or major (default: patch).
#>

param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Type = "patch"
)

$pkgPath = "package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$currentVersion = $pkg.version
$parts = $currentVersion -split "\."
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

switch ($Type) {
  "major" { $major++; $minor = 0; $patch = 0 }
  "minor" { $minor++; $patch = 0 }
  "patch" { $patch++ }
}

$newVersion = "$major.$minor.$patch"
$newContent = (Get-Content $pkgPath -Raw) -replace '"version":\s*"' + [regex]::Escape($currentVersion) + '"', '"version": "' + $newVersion + '"'
Set-Content $pkgPath $newContent -NoNewline

Write-Host "Version bumped: $currentVersion -> $newVersion" -ForegroundColor Green

$confirm = Read-Host "Create git commit for this version bump? (y/N)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
  & git add $pkgPath
  & git commit -m "chore: bump version to $newVersion"
  Write-Host "Commit created." -ForegroundColor Green
} else {
  Write-Host "Not committed. Run 'git add package.json && git commit' manually." -ForegroundColor Yellow
}
