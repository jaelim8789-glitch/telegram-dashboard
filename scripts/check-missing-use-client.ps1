# PowerShell script to detect missing "use client" directives in TSX files
# Finds TSX files that use React hooks but don't have "use client" directive

Write-Host "Checking for missing 'use client' directives in TSX files..." -ForegroundColor Yellow

# Find all TSX files that contain React hooks but don't have "use client"
$files = Get-ChildItem -Path "./src" -Recurse -Include "*.tsx" | Where-Object {
    $content = Get-Content $_.FullName -Raw
    ($content -match '\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|useImperativeHandle|useLayoutEffect|useDebugValue|useDeferredValue|useTransition)\b') -and 
    ($content -notmatch '^["'']use client['"']' -and $content -notmatch '\n\s*["'']use client['"']')
}

if ($files.Count -gt 0) {
    Write-Host "`nThe following files use React hooks but are missing 'use client':" -ForegroundColor Red
    foreach ($file in $files) {
        Write-Host "  - $($file.FullName)" -ForegroundColor Red
    }
    Write-Host "`nTotal files with missing 'use client': $($files.Count)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nNo files found that are missing 'use client' directive." -ForegroundColor Green
    exit 0
}

Write-Host "Check completed." -ForegroundColor Cyan