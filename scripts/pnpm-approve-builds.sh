#!/usr/bin/env bash
set -e
echo "=== pnpm approve-builds ==="
echo "Approving commonly needed build dependencies..."
pnpm approve-builds
echo "Done. Run 'pnpm install' to apply."
