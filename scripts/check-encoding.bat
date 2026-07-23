@echo off
REM scripts/check-encoding.bat
REM Windows batch wrapper: detect non-UTF-8 files in src/
REM Usage: scripts\check-encoding.bat [--fix]

setlocal enabledelayedexpansion
set FIX=0
if "%1"=="--fix" set FIX=1

echo [CHECK] Scanning src/ for non-UTF-8 files...
echo.

set EXIT=0
for /r src\ %%f in (*.ts *.tsx *.js *.jsx) do (
  set "FILE=%%f"
  set "IS_BIN=0"
  REM Check for UTF-16 BOM (FF FE or FE FF)
  for /f "skip=1 tokens=1,2 delims= " %%a in ('certutil -encodehex "%%f" 2^>nul ^| findstr /b "00000000"') do (
    set "HEX=%%a%%b"
    if "!HEX:~0,4!"=="fffe" set "IS_BIN=1"
    if "!HEX:~0,4!"=="feff" set "IS_BIN=1"
  )
  if !IS_BIN! equ 1 (
    echo  [ERROR] %%f is not UTF-8
    set EXIT=1
    if !FIX! equ 1 (
      powershell -Command "$c=[System.IO.File]::ReadAllText('%%f');[System.IO.File]::WriteAllText('%%f',$c,[System.Text.Encoding]::UTF8)"
      echo  [FIX] Converted %%f
    )
  )
)
if %EXIT% equ 0 (
  echo [PASS] All source files are UTF-8 encoded.
) else (
  echo.
  echo [FAIL] Non-UTF-8 files found. Run with --fix to convert.
)
exit /b %EXIT%
