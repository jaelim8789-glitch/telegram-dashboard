#!/usr/bin/env bash
set -e
echo "=== Setup direnv ==="
if ! command -v direnv &>/dev/null; then
  echo "Installing direnv..."
  case "$(uname -s)" in
    Linux) sudo apt install direnv 2>/dev/null || sudo pacman -S direnv 2>/dev/null || echo "See: https://direnv.net/docs/installation.html" ;;
    Darwin) brew install direnv ;;
    *) echo "Install manually: winget install direnv" && exit 1 ;;
  esac
fi
direnv allow
echo "direnv allowed — .envrc will auto-load on cd"
