#!/bin/bash
set -euo pipefail

echo "🔍 Checking file encoding..."

dirty=$(find src/ -name '*.tsx' -o -name '*.ts' | xargs file | grep -i 'utf-16\|Non-ISO' || true)

if [ -z "$dirty" ]; then
  echo "✅ All files are UTF-8"
  exit 0
fi

echo "❌ UTF-16 / Non-ISO detected — converting to UTF-8..."
echo "$dirty"

echo "$dirty" | while read -r line; do
  file=$(echo "$line" | awk -F: '{print $1}')
  echo "  Converting: $file"
  iconv -f UTF-16 -t UTF-8 "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done

echo "✅ Conversion complete"
