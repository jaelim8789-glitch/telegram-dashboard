@echo off
cd /d C:\Dev\TeleMon

echo ===== STEP: feat/02-account-favorites BUILD VERIFICATION =====
echo.

echo --- git status ---
git status --short
echo.

echo --- run build ---
call npx next build > build_output.txt 2>&1
echo.

echo --- check result ---
findstr /C:"Compiled successfully" build_output.txt >nul
if %errorlevel% equ 0 (
    echo [PASS] Build compiled successfully
) else (
    findstr /C:"Failed to compile" build_output.txt >nul
    if %errorlevel% equ 0 (
        echo [FAIL] Build failed!
        type build_output.txt
        exit /b 1
    ) else (
        echo [WARN] Could not determine build result
        type build_output.txt
        exit /b 1
    )
)

echo.
echo ===== BUILD VERIFIED SUCCESSFULLY =====