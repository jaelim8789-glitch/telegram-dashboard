@echo off
setlocal enabledelayedexpansion
cd /d C:\Dev\TeleMon

echo ========================================
echo TeleMon - Master Merge & Build Script
echo ========================================
echo.
echo This script will:
echo 1. Merge Chain A: feat/06, 11, 10, 15
echo 2. Run TypeScript type check
echo 3. Merge Chain B: account-labels, account-search, keyboard-shortcuts, csv-export, tab-error-badge, message-templates
echo 4. Run TypeScript type check again
echo 5. Run full Next.js build
echo.
echo Log file: C:\Dev\TeleMon\scripts\master_result.txt
echo.
pause

echo ======================================== > C:\Dev\TeleMon\scripts\master_result.txt
echo MASTER MERGE AND BUILD SCRIPT >> C:\Dev\TeleMon\scripts\master_result.txt
echo %DATE% %TIME% >> C:\Dev\TeleMon\scripts\master_result.txt
echo ======================================== >> C:\Dev\TeleMon\scripts\master_result.txt

echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo [STATE BEFORE] >> C:\Dev\TeleMon\scripts\master_result.txt
git rev-parse HEAD >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
git log --oneline -5 >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
echo. >> C:\Dev\TeleMon\scripts\master_result.txt

rem ===== CHAIN A =====
echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo ===== CHAIN A MERGES ===== >> C:\Dev\TeleMon\scripts\master_result.txt

for %%b in (feat/06-cheatsheet-modal feat/11-fullscreen-toggle feat/10-account-search-enhance feat/15-delivery-analytics-csv) do (
    echo. >> C:\Dev\TeleMon\scripts\master_result.txt
    echo --- Merging %%b --- >> C:\Dev\TeleMon\scripts\master_result.txt
    git --no-pager merge %%b --no-ff -m "Merge %%b" >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] %%b merged successfully >> C:\Dev\TeleMon\scripts\master_result.txt
        echo [OK] %%b merged successfully
    ) else (
        echo [FAIL] %%b FAILED with code !ERRORLEVEL! >> C:\Dev\TeleMon\scripts\master_result.txt
        echo [FAIL] %%b FAILED - Check master_result.txt
        echo === ABORTING === >> C:\Dev\TeleMon\scripts\master_result.txt
        pause
        exit /b 1
    )
)

echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo ===== CHAIN A COMPLETE ===== >> C:\Dev\TeleMon\scripts\master_result.txt
echo Chain A complete!

rem ===== TYPE CHECK =====
echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo === TypeScript Check (after Chain A) === >> C:\Dev\TeleMon\scripts\master_result.txt
echo Running TypeScript check...
call npx tsc --noEmit >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] TypeScript check passed >> C:\Dev\TeleMon\scripts\master_result.txt
    echo TypeScript check passed!
) else (
    echo [FAIL] TypeScript check FAILED >> C:\Dev\TeleMon\scripts\master_result.txt
    echo [FAIL] TypeScript check FAILED - Check master_result.txt
    pause
    exit /b 1
)

rem ===== CHAIN B =====
echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo ===== CHAIN B MERGES ===== >> C:\Dev\TeleMon\scripts\master_result.txt

for %%b in (feat/account-labels feat/account-search feat/keyboard-shortcuts feat/csv-export feat/tab-error-badge feat/message-templates) do (
    echo. >> C:\Dev\TeleMon\scripts\master_result.txt
    echo --- Merging %%b --- >> C:\Dev\TeleMon\scripts\master_result.txt
    git --no-pager merge %%b --no-ff -m "Merge %%b" >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] %%b merged successfully >> C:\Dev\TeleMon\scripts\master_result.txt
        echo [OK] %%b merged successfully
    ) else (
        echo [FAIL] %%b FAILED with code !ERRORLEVEL! >> C:\Dev\TeleMon\scripts\master_result.txt
        echo [FAIL] %%b FAILED - Check master_result.txt
        echo === ABORTING === >> C:\Dev\TeleMon\scripts\master_result.txt
        pause
        exit /b 1
    )
)

echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo ===== CHAIN B COMPLETE ===== >> C:\Dev\TeleMon\scripts\master_result.txt
echo Chain B complete!

rem ===== FINAL TYPE CHECK =====
echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo === TypeScript Check (after all merges) === >> C:\Dev\TeleMon\scripts\master_result.txt
echo Running final TypeScript check...
call npx tsc --noEmit >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] Final TypeScript check passed >> C:\Dev\TeleMon\scripts\master_result.txt
    echo Final TypeScript check passed!
) else (
    echo [FAIL] Final TypeScript check FAILED >> C:\Dev\TeleMon\scripts\master_result.txt
    echo [FAIL] Final TypeScript check FAILED - Check master_result.txt
    pause
    exit /b 1
)

rem ===== BUILD =====
echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo === Next.js Build === >> C:\Dev\TeleMon\scripts\master_result.txt
echo Running Next.js production build (may take 2-3 minutes)...
call npx next build >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] Build passed >> C:\Dev\TeleMon\scripts\master_result.txt
    echo Build passed!
) else (
    echo [FAIL] Build FAILED with code !ERRORLEVEL! >> C:\Dev\TeleMon\scripts\master_result.txt
    echo [FAIL] Build FAILED - Check master_result.txt
    pause
    exit /b 1
)

echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo ======================================== >> C:\Dev\TeleMon\scripts\master_result.txt
echo FINAL STATE: >> C:\Dev\TeleMon\scripts\master_result.txt
git rev-parse HEAD >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
git log --oneline -5 >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
echo. >> C:\Dev\TeleMon\scripts\master_result.txt
git status --short >> C:\Dev\TeleMon\scripts\master_result.txt 2>&1
echo. >> C:\Dev\TeleMon\scripts\master_result.txt
echo ===== ALL STEPS COMPLETED SUCCESSFULLY ===== >> C:\Dev\TeleMon\scripts\master_result.txt

echo.
echo ========================================
echo ALL STEPS COMPLETED SUCCESSFULLY
echo ========================================
echo.
echo Log saved to: C:\Dev\TeleMon\scripts\master_result.txt
echo.
pause