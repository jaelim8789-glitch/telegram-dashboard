#!/usr/bin/env bash
# Quick verify: typecheck + lint + build in one command
set -e
echo "=== TypeScript ==="
npx tsc --noEmit && echo "PASS"
echo "=== Lint ==="
pnpm lint && echo "PASS"
echo "=== Build ==="
npm run build && echo "PASS"
echo "=== ALL PASSED ==="
