#!/usr/bin/env bash
# 1줄 git blame 요약 — "이 파일 마지막으로 누가, 언제, 왜 수정했는지"
# 사용법: blame-summary <파일경로>
set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "🔍 사용법: blame-summary <파일경로>"
  echo "   예: blame-summary src/components/ui/Toast.tsx"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "❌ 파일 없음: $FILE"
  exit 1
fi

echo "📄 $FILE"
git blame -L 1,1 -p "$FILE" 2>/dev/null | head -20 | awk '
/hash/ { hash = $2 }
/author / { $1 = ""; author = substr($0,2) }
/author-time/ { ts = $2 }
/summary / { $1 = ""; summary = substr($0,2) }
END {
  date = strftime("%Y-%m-%d %H:%M", ts)
  printf "👤 %s  |  🕐 %s  |  🔖 %s\n", author, date, summary
  printf "   커밋: %s\n", hash
}
' 2>/dev/null || {
  # Fallback: 간단한 포맷
  git log --oneline -1 --format="👤 %an  |  🕐 %ai  |  %s" -- "$FILE"
}
