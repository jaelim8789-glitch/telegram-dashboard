@echo off
cd /d C:\Dev\TeleMon

echo ===== GIT LOG (last 5) ===== > %cd%\scripts\build-result.txt
git log --oneline -5 >> %cd%\scripts\build-result.txt 2>&1
echo. >> %cd%\scripts\build-result.txt

echo ===== GIT STATUS ===== >> %cd%\scripts\build-result.txt
git status --short >> %cd%\scripts\build-result.txt 2>&1
echo. >> %cd%\scripts\build-result.txt

echo ===== RUNNING BUILD... ===== >> %cd%\scripts\build-result.txt
call npx next build >> %cd%\scripts\build-result.txt 2>&1
echo. >> %cd%\scripts\build-result.txt

echo ===== BUILD EXIT CODE: %ERRORLEVEL% ===== >> %cd%\scripts\build-result.txt

if %ERRORLEVEL% equ 0 (
    echo [RESULT] BUILD PASSED >> %cd%\scripts\build-result.txt
) else (
    echo [RESULT] BUILD FAILED (exit code %ERRORLEVEL%) >> %cd%\scripts\build-result.txt
)

echo Done. Check scripts/build-result.txt