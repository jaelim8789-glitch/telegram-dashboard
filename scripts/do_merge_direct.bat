@echo off
cd /d C:\Dev\TeleMon
set GIT_PAGER=cat
set PAGER=cat
git --no-pager merge feat/06-cheatsheet-modal --no-ff -m "Merge feat/06-cheatsheet-modal" > C:\Dev\TeleMon\scripts\merge_out.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> C:\Dev\TeleMon\scripts\merge_out.txt