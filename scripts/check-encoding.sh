#!/usr/bin/env bash
set -e

echo "=== TeleMon 인코딩 검사 ==="

# 검색할 파일 확장자
EXTENSIONS="*.ts,*.tsx,*.js,*.mjs,*.json,*.yml,*.yaml,*.md,*.py,*.html,*.css,*.scss,*.txt"

# UTF-16, ISO-8859, Latin-1 등 비UTF-8 파일 탐지
echo "비 UTF-8 인코딩 파일 검색 중..."
NON_UTF8_FILES=$(find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' -o -name '*.md' -o -name '*.py' -o -name '*.html' -o -name '*.css' -o -name '*.scss' -o -name '*.txt' \) ! -path './node_modules/*' ! -path './.next/*' ! -path './.git/*' ! -path './dist/*' ! -path './build/*' -exec file {} \; | grep -i 'UTF-16\|Unicode with BOM\|ISO-8859\|Latin-1' || true)

# 특수문자(❵❵ 등) 포함 파일 탐지
echo "특수문자 파일 검색 중..."
SPECIAL_CHAR_FILES=$(find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' -o -name '*.md' -o -name '*.py' -o -name '*.html' -o -name '*.css' -o -name '*.scss' -o -name '*.txt' \) ! -path './node_modules/*' ! -path './.next/*' ! -path './.git/*' ! -path './dist/*' ! -path './build/*' -exec grep -l $'[\\xf0-\\xff][\\x80-\\xbf][\\x80-\\xbf][\\x80-\\xbf]\\|[\\xe0-\\xef][\\x80-\\xbf][\\x80-\\xbf]\\|[\\xd0-\\xdf][\\x80-\\xbf]' {} \; 2>/dev/null || true)

# 결과 확인
HAS_ERRORS=0

if [ -n "$NON_UTF8_FILES" ]; then
  echo "비 UTF-8 인코딩 파일 발견:"
  echo "$NON_UTF8_FILES"
  HAS_ERRORS=1
fi

if [ -n "$SPECIAL_CHAR_FILES" ]; then
  echo "특수문자 포함 파일 발견:"
  echo "$SPECIAL_CHAR_FILES"
  HAS_ERRORS=1
fi

if [ $HAS_ERRORS -eq 1 ]; then
  echo ""
  echo "ERROR: 인코딩 문제가 감지되었습니다!"
  exit 1
else
  echo "인코딩 문제 없음."
fi