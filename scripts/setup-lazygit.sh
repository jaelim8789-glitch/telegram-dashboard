#!/usr/bin/env bash
set -e
echo "=== Setup Lazygit ==="
if ! command -v lazygit &>/dev/null; then
  echo "Installing lazygit..."
  case "$(uname -s)" in
    Linux) sudo pacman -S lazygit 2>/dev/null || sudo apt install lazygit 2>/dev/null || echo "See: https://github.com/jesseduffield/lazygit#installation" ;;
    Darwin) brew install lazygit ;;
    *) echo "Install manually: winget install lazygit" && exit 1 ;;
  esac
fi
lazygit --version
git config --global alias.lg '!lazygit'
echo "Alias 'git lg' → lazygit"
