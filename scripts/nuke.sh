#!/usr/bin/env bash
# nuke and rebuild: delete node_modules + .next, reinstall, rebuild
set -e
echo "=== Nuking node_modules and .next ==="
rm -rf node_modules .next
echo "=== Reinstalling ==="
pnpm install
echo "=== Building ==="
npm run build
echo "=== Done — fresh build ready ==="
