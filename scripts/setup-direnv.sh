#!/bin/bash
if [[ "$OSTYPE" == "msys" ]]; then
  winget install direnv 2>/dev/null || echo "Install manually: winget install direnv"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  brew install direnv
else
  sudo apt install direnv -y 2>/dev/null || sudo dnf install direnv -y 2>/dev/null
fi
direnv allow 2>/dev/null || true
echo "direnv installed and allowed. Add 'eval \"$(direnv hook zsh)\"' to your .zshrc"