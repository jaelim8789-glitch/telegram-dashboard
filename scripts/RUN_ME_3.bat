@echo off
setlocal enabledelayedexpansion
cd /d C:\Dev\TeleMon

set LOGFILE=C:\Dev\TeleMon\scripts\master_result3.txt
echo ======================================== > %LOGFILE%
echo CONTINUED MERGE SCRIPT (conflict fix #2) >> %LOGFILE%
echo %DATE% %TIME% >> %LOGFILE%
echo ======================================== >> %LOGFILE%

echo. >> %LOGFILE%
echo [STATE BEFORE] >> %LOGFILE%
git rev-parse HEAD >> %LOGFILE% 2>&1
git log --oneline -3 >> %LOGFILE% 2>&1
echo. >> %LOGFILE%

rem ===== STAGE RESOLVED FILES AND COMMIT MERGE =====
echo --- Staging resolved Sidebar.tsx and committing merge --- >> %LOGFILE%
git add src/components/layout/Sidebar.tsx >> %LOGFILE% 2>&1
git commit --no-edit -m "Merge feat/account-search" >> %LOGFILE% 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] feat/account-search merge committed >> %LOGFILE%
    echo [OK] feat/account-search merged!
) else (
    echo [FAIL] feat/account-search commit FAILED >> %LOGFILE%
    echo.
    echo git status below: >> %LOGFILE%
    git status >> %LOGFILE% 2>&1
    pause
    exit /b 1
)

rem ===== CHAIN B (remaining) =====
echo. >> %LOGFILE%
echo ===== CHAIN B (REMAINING) ===== >> %LOGFILE%

for %%b in (feat/keyboard-shortcuts feat/csv-export feat/tab-error-badge feat/message-templates) do (
    echo. >> %LOGFILE%
    echo --- Merging %%b --- >> %LOGFILE%
    git --no-pager merge %%b --no-ff -m "Merge %%b" >> %LOGFILE% 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] %%b merged successfully >> %LOGFILE%
        echo [OK] %%b merged!
    ) else (
        echo [FAIL] %%b FAILED with code !ERRORLEVEL! >> %LOGFILE%
        echo git status: >> %LOGFILE%
        git status >> %LOGFILE% 2>&1
        echo === ABORTING === >> %LOGFILE%
        pause
        exit /b 1
    )
)

echo. >> %LOGFILE%
echo ===== CHAIN B COMPLETE ===== >> %LOGFILE%
echo Chain B complete!

rem ===== TYPE CHECK =====
echo. >> %LOGFILE%
echo === TypeScript Check === >> %LOGFILE%
echo Running TypeScript check...
call npx tsc --noEmit >> %LOGFILE% 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] TypeScript check passed >> %LOGFILE%
    echo TypeScript check passed!
) else (
    echo [FAIL] TypeScript check FAILED >> %LOGFILE%
    type %LOGFILE%
    pause
    exit /b 1
)

rem ===== BUILD =====
echo. >> %LOGFILE%
echo === Next.js Build === >> %LOGFILE%
echo Running Next.js production build (may take 2-3 minutes)...
call npx next build >> %LOGFILE% 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK] Build passed >> %LOGFILE%
    echo Build passed!
) else (
    echo [FAIL] Build FAILED >> %LOGFILE%
    type %LOGFILE%
    pause
    exit /b 1
)

echo. >> %LOGFILE%
echo ======================================== >> %LOGFILE%
echo FINAL STATE: >> %LOGFILE%
git rev-parse HEAD >> %LOGFILE% 2>&1
git log --oneline -10 >> %LOGFILE% 2>&1
echo. >> %LOGFILE%
git status --short >> %LOGFILE% 2>&1
echo. >> %LOGFILE%
echo ===== ALL STEPS COMPLETED SUCCESSFULLY ===== >> %LOGFILE%

echo.
echo ========================================
echo ALL STEPS COMPLETED SUCCESSFULLY
echo ========================================
echo.
echo Log saved to: %LOGFILE%
echo.
pause