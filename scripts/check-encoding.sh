#!/usr/bin/env bash
set -e
echo "=== TeleMon UTF-16 Encoding Check ==="
echo "Scanning for UTF-16 files..."
FILES=$(find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' -o -name '*.md' -o -name '*.py' \) ! -path './node_modules/*' ! -path './.next/*' ! -path './.git/*' -exec file {} \; | grep -i 'UTF-16\|Unicode with BOM')
if [ -z "$FILES" ]; then
  echo "No UTF-16 files found."
else
  echo "Found UTF-16 files:"
  echo "$FILES"
  echo ""
  echo "Converting to UTF-8..."
  echo "$FILES" | cut -d: -f1 | while IFS= read -r f; do
    echo "Converting: $f"
    iconv -f UTF-16LE -t UTF-8 "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
  done
  echo "Done. Check git diff for changes."
fi
