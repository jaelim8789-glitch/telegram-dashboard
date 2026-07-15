@echo off
setlocal enabledelayedexpansion
cd /d C:\Dev\TeleMon

set OUTPUT=C:\Dev\TeleMon\scripts\merge_final_log.txt
echo MERGE RUN STARTED > %OUTPUT%
echo %DATE% %TIME% >> %OUTPUT%
echo. >> %OUTPUT%

echo === HEAD BEFORE === >> %OUTPUT%
git rev-parse HEAD >> %OUTPUT% 2>&1
git log --oneline -5 >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

set BRANCHES=feat/06-cheatsheet-modal feat/11-fullscreen-toggle feat/10-account-search-enhance feat/15-delivery-analytics-csv feat/account-labels feat/account-search feat/keyboard-shortcuts feat/csv-export feat/tab-error-badge feat/message-templates

for %%b in (%BRANCHES%) do (
    echo. >> %OUTPUT%
    echo === MERGING %%b === >> %OUTPUT%
    git --no-pager merge %%b --no-ff -m "Merge %%b" >> %OUTPUT% 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] %%b merged >> %OUTPUT%
    ) else (
        echo [FAIL] %%b FAILED (exit code !ERRORLEVEL!) >> %OUTPUT%
        type %OUTPUT%
        exit /b 1
    )
    echo. >> %OUTPUT%
)

echo. >> %OUTPUT%
echo === HEAD AFTER === >> %OUTPUT%
git rev-parse HEAD >> %OUTPUT% 2>&1
git log --oneline -5 >> %OUTPUT% 2>&1
echo. >> %OUTPUT%
echo ALL MERGES COMPLETE >> %OUTPUT%