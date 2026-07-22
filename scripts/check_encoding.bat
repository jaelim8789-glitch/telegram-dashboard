@echo off
REM Batch wrapper for Python encoding check script

python scripts/check_encoding.py %*
exit /b %ERRORLEVEL%