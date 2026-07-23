#!/usr/bin/env bash
# setup-https.sh — Local HTTPS for Telegram Mini App login testing
# Uses mkcert to create trusted local certs.
# Prerequisites: choco install mkcert (Windows) or brew install mkcert (macOS)
# or apt install mkcert (Linux)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../certs"

echo "==> [setup-https] Checking mkcert..."
if ! command -v mkcert &>/dev/null; then
  echo "  ERROR: mkcert not found. Install it first:"
  echo "    Windows: choco install mkcert"
  echo "    macOS:   brew install mkcert"
  echo "    Linux:   sudo apt install mkcert  (or: sudo pacman -S mkcert)"
  exit 1
fi

echo "==> [setup-https] Installing local CA..."
mkcert -install

mkdir -p "$CERT_DIR"

echo "==> [setup-https] Generating certs for localhost + 127.0.0.1 + *.telemon.local..."
mkcert -key-file "$CERT_DIR/localhost-key.pem" \
       -cert-file "$CERT_DIR/localhost.pem" \
       localhost 127.0.0.1 ::1 *.telemon.local telemon.local

echo ""
echo "  ✅ Certs created at: $CERT_DIR/"
echo "  ├── localhost.pem       (certificate)"
echo "  └── localhost-key.pem   (private key)"
echo ""
echo "  To use with Next.js dev:"
echo "    next dev --experimental-https --experimental-https-key $CERT_DIR/localhost-key.pem --experimental-https-cert $CERT_DIR/localhost.pem"
echo ""
echo "  Or add to .env.local:"
echo "    LOCAL_CERT=$CERT_DIR/localhost.pem"
echo "    LOCAL_KEY=$CERT_DIR/localhost-key.pem"
