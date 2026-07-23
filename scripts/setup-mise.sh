#!/bin/bash
if [[ "$OSTYPE" == "msys" ]]; then
  winget install jdx.mise 2>/dev/null || echo "Install manually: winget install jdx.mise"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  brew install mise
else
  curl https://mise.run | sh
fi
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc 2>/dev/null || true
mise install
echo "mise installed. Tools: $(mise ls)"