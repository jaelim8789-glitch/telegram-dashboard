#!/usr/bin/env bash
# scripts/check-encoding.sh
# Scans .ts/.tsx/.js/.jsx files in src/ for non-UTF-8 files,
# reports them, and optionally converts to UTF-8.
# Usage:
#   bash scripts/check-encoding.sh          # scan only
#   bash scripts/check-encoding.sh --fix    # scan + convert

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FIX=false
[[ "${1:-}" == "--fix" ]] && FIX=true

echo -e "${YELLOW}🔍 Scanning src/ for non-UTF-8 encoded files...${NC}"

if ! command -v file &>/dev/null; then
  echo -e "${RED}❌ 'file' command not found.${NC}"
  exit 1
fi

BAD=()
while IFS= read -r -d '' f; do
  enc=$(file --mime-encoding "$f" 2>/dev/null | sed 's/.*: //')
  if [[ "$enc" != "utf-8" && "$enc" != "us-ascii" && "$enc" != "binary" ]]; then
    BAD+=("$f")
    echo -e "${RED}  ✗ $f (encoding: $enc)${NC}"
  fi
done < <(find src/ \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) -print0)

if [ ${#BAD[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All source files are UTF-8 encoded.${NC}"
  exit 0
fi

echo -e "${RED}❌ Found ${#BAD[@]} file(s) with non-UTF-8 encoding.${NC}"

if $FIX; then
  echo -e "${YELLOW}🔄 Converting to UTF-8...${NC}"
  for f in "${BAD[@]}"; do
    enc=$(file --mime-encoding "$f" 2>/dev/null | sed 's/.*: //')
    if [[ "$enc" == *"utf-16"* ]]; then
      iconv -f "$enc" -t UTF-8 "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
      echo -e "${GREEN}  ✓ $f converted${NC}"
    else
      echo -e "${YELLOW}  ⚠ Skipping $f (unsupported: $enc)${NC}"
    fi
  done
  echo -e "${GREEN}✅ Conversion complete.${NC}"
else
  echo -e "${YELLOW}💡 To convert: bash scripts/check-encoding.sh --fix${NC}"
fi
exit 1
