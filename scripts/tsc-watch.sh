#!/usr/bin/env bash
# Run TypeScript typecheck in watch mode — real-time feedback
echo "=== TypeScript watch mode ==="
echo "Files will be checked on every save."
echo "Use Ctrl+C to stop."
echo ""
npx tsc --noEmit --watch
