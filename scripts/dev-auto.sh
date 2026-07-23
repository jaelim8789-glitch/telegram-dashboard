#!/bin/bash
# watchexec: auto rebuild on file change
# Usage: bash scripts/dev-auto.sh [command]
# Default: pnpm build
CMD="${1:-pnpm build}"
WATCH_EXT="${2:-ts,tsx}"
echo "Watching *.$WATCH_EXT changes..."
echo "Command: $CMD"
echo ""
watchexec -e "$WATCH_EXT" -- $CMD