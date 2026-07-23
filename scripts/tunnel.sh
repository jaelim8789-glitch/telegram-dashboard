#!/usr/bin/env bash
set -e
echo "=== TeleMon Cloudflare Tunnel ==="
if ! command -v cloudflared &>/dev/null; then
  echo "Installing cloudflared..."
  case "$(uname -s)" in
    Linux) curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared ;;
    Darwin) brew install cloudflare/cloudflare/cloudflared ;;
    *) echo "Unsupported OS. Install manually: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" && exit 1 ;;
  esac
fi
echo "Starting tunnel to http://localhost:3000..."
cloudflared tunnel --url http://localhost:3000
