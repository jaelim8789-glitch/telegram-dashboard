#!/usr/bin/env bash
set -e
echo "=== Setup mise ==="
if ! command -v mise &>/dev/null; then
  echo "Installing mise..."
  curl https://mise.run | sh
  eval "$(~/.local/bin/mise activate bash)"
fi
mise install
echo "Node: $(mise exec -- node --version)"
echo "Python: $(mise exec -- python --version)"
