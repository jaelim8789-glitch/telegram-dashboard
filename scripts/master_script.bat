@echo off
setlocal enabledelayedexpansion
cd /d C:\Dev\TeleMon

set LOGFILE=C:\Dev\TeleMon\scripts\master_result.txt
echo ======================================== > %LOGFILE%
echo MASTER MERGE AND BUILD SCRIPT STARTED >> %LOGFILE%
echo %DATE% %TIME% >> %LOGFILE%
echo ======================================== >> %LOGFILE%

echo. >> %LOGFILE%
echo [1/5] Current state: >> %LOGFILE%
git rev-parse HEAD >> %LOGFILE% 2>&1
git log --oneline -5 >> %LOGFILE% 2>&1
echo. >> %LOGFILE%
echo Branch: >> %LOGFILE%
git branch >> %LOGFILE% 2>&1
echo. >> %LOGFILE%

rem ===== CHAIN A =====
echo ===== CHAIN A MERGES ===== >> %LOGFILE%

set CHAIN_A=feat/06-cheatsheet-modal feat/11-fullscreen-toggle feat/10-account-search-enhance feat/15-delivery-analytics-csv
for %%b in (%CHAIN_A%) do (
    echo. >> %LOGFILE%
    echo --- Merging %%b --- >> %LOGFILE%
    git --no-pager merge %%b --no-ff -m "Merge %%b" >> %LOGFILE% 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] %%b merged >> %LOGFILE%
    ) else (
        echo [FAIL] %%b FAILED >> %LOGFILE%
        exit /b 1
    )
)

echo. >> %LOGFILE%
echo ===== CHAIN A COMPLETE ===== >> %LOGFILE%
echo. >> %LOGFILE%

rem ===== TYPECHECK =====
echo ===== TYPE CHECK ===== >> %LOGFILE%
call npx tsc --noEmit >> %LOGFILE% 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] TypeScript check passed >> %LOGFILE%
) else (
    echo [FAIL] TypeScript check FAILED >> %LOGFILE%
    exit /b 1
)
echo. >> %LOGFILE%

rem ===== CHAIN B =====
echo ===== CHAIN B MERGES ===== >> %LOGFILE%

set CHAIN_B=feat/account-labels feat/account-search feat/keyboard-shortcuts feat/csv-export feat/tab-error-badge feat/message-templates
for %%b in (%CHAIN_B%) do (
    echo. >> %LOGFILE%
    echo --- Merging %%b --- >> %LOGFILE%
    git --no-pager merge %%b --no-ff -m "Merge %%b" >> %LOGFILE% 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] %%b merged >> %LOGFILE%
    ) else (
        echo [FAIL] %%b FAILED >> %LOGFILE%
        exit /b 1
    )
)

echo. >> %LOGFILE%
echo ===== CHAIN B COMPLETE ===== >> %LOGFILE%
echo. >> %LOGFILE%

rem ===== TYPECHECK 2 =====
echo ===== TYPE CHECK (AFTER ALL MERGES) ===== >> %LOGFILE%
call npx tsc --noEmit >> %LOGFILE% 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] TypeScript check passed >> %LOGFILE%
) else (
    echo [FAIL] TypeScript check FAILED >> %LOGFILE%
    exit /b 1
)
echo. >> %LOGFILE%

rem ===== BUILD =====
echo ===== BUILD ===== >> %LOGFILE%
call npx next build >> %LOGFILE% 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] Build passed >> %LOGFILE%
) else (
    echo [FAIL] Build FAILED >> %LOGFILE%
    exit /b 1
)
echo. >> %LOGFILE%

echo ======================================== >> %LOGFILE%
echo FINAL STATE: >> %LOGFILE%
git rev-parse HEAD >> %LOGFILE% 2>&1
git log --oneline -5 >> %LOGFILE% 2>&1
echo. >> %LOGFILE%
git status --short >> %LOGFILE% 2>&1
echo. >> %LOGFILE%
echo ===== ALL STEPS COMPLETED SUCCESSFULLY ===== >> %LOGFILE%