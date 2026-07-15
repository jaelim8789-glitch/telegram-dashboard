@echo off
cd /d C:\Dev\TeleMon

echo Current HEAD before merge:
git rev-parse HEAD > scripts\merge_progress.txt
git log --oneline -3 >> scripts\merge_progress.txt

echo. >> scripts\merge_progress.txt

echo [STEP] Merging feat/06-cheatsheet-modal... >> scripts\merge_progress.txt
git merge feat/06-cheatsheet-modal --no-ff -m "Merge feat/06-cheatsheet-modal" >> scripts\merge_progress.txt 2>&1
if %errorlevel% neq 0 (
    echo FAILED at feat/06 >> scripts\merge_progress.txt
    exit /b 1
)
echo. >> scripts\merge_progress.txt

echo [STEP] Merging feat/11-fullscreen-toggle... >> scripts\merge_progress.txt
git merge feat/11-fullscreen-toggle --no-ff -m "Merge feat/11-fullscreen-toggle" >> scripts\merge_progress.txt 2>&1
if %errorlevel% neq 0 (
    echo FAILED at feat/11 >> scripts\merge_progress.txt
    exit /b 1
)
echo. >> scripts\merge_progress.txt

echo [STEP] Merging feat/10-account-search-enhance... >> scripts\merge_progress.txt
git merge feat/10-account-search-enhance --no-ff -m "Merge feat/10-account-search-enhance" >> scripts\merge_progress.txt 2>&1
if %errorlevel% neq 0 (
    echo FAILED at feat/10 >> scripts\merge_progress.txt
    exit /b 1
)
echo. >> scripts\merge_progress.txt

echo [STEP] Merging feat/15-delivery-analytics-csv... >> scripts\merge_progress.txt
git merge feat/15-delivery-analytics-csv --no-ff -m "Merge feat/15-delivery-analytics-csv" >> scripts\merge_progress.txt 2>&1
if %errorlevel% neq 0 (
    echo FAILED at feat/15 >> scripts\merge_progress.txt
    exit /b 1
)
echo. >> scripts\merge_progress.txt

echo Final HEAD: >> scripts\merge_progress.txt
git rev-parse HEAD >> scripts\merge_progress.txt
git log --oneline -5 >> scripts\merge_progress.txt
echo. >> scripts\merge_progress.txt
echo ALL MERGES COMPLETE >> scripts\merge_progress.txt

echo Done. Check scripts\merge_progress.txt