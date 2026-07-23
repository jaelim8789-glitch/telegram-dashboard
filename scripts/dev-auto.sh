#!/usr/bin/env bash
set -e
echo "=== TeleMon Auto-Rebuild (watchexec) ==="
if ! command -v watchexec &>/dev/null; then
  echo "Installing watchexec..."
  case "$(uname -s)" in
    Linux) sudo apt install watchexec 2>/dev/null || sudo pacman -S watchexec 2>/dev/null || echo "See: https://github.com/watchexec/watchexec#installation" ;;
    Darwin) brew install watchexec ;;
    *) echo "Install manually: winget install watchexec" && exit 1 ;;
  esac
fi
echo "Watching src/ + backend/ for changes..."
watchexec -e ts,tsx,py,md -r -- pnpm build
