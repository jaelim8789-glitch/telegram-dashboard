#!/usr/bin/env bash
set -e
echo "=== TeleMon Local CI (act) ==="
if ! command -v act &>/dev/null; then
  echo "Installing act..."
  curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
fi
act -j frontend-build -W .github/workflows/local-act.yml
