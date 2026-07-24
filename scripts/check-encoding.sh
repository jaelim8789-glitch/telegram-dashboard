#!/bin/bash

# 인코딩 검사 스크립트 - 비UTF-8 파일 및 특수문자 포함 파일 탐지
# 사용법: bash check-encoding.sh [directory]

TARGET_DIR="${1:-.}"

echo "=== 인코딩 문제 검사 시작 ==="
echo "대상 디렉토리: $TARGET_DIR"

# 비 UTF-8 인코딩 파일 검사 (UTF-16, ISO-8859, Latin-1 등)
echo "비 UTF-8 인코딩 파일 검사 중..."
NON_UTF8_FILES=$(find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" -o -name "*.txt" -o -name "*.py" -o -name "*.yaml" -o -name "*.yml" -o -name "*.xml" -o -name "*.html" -o -name "*.css" \) -exec file {} \; | grep -i "unicode\|utf-16\|iso-8859\|latin" | cut -d: -f1)

if [ -n "$NON_UTF8_FILES" ]; then
    echo "비 UTF-8 인코딩 파일 발견:"
    echo "$NON_UTF8_FILES"
    echo
fi

# 특수문자 (예: ❴❵ 등 유니코드 기호) 포함 파일 검사
echo "특수문자 포함 파일 검사 중..."
SPECIAL_CHAR_FILES=""
while IFS= read -r -d '' file; do
    # 파일에서 특수문자 패턴 검색 (U+2774-U+2775: ❴❵,以及其他常见特殊符号)
    if grep -P '[^\x00-\x7F]|[❴❵]' "$file" >/dev/null 2>&1; then
        SPECIAL_CHAR_FILES="$SPECIAL_CHAR_FILES$file"$'\n'
    fi
done < <(find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" -o -name "*.txt" -o -name "*.py" -o -name "*.yaml" -o -name "*.yml" -o -name "*.xml" -o -name "*.html" -o -name "*.css" \) -print0)

# 개행문자 제거 후 다시 검사
SPECIAL_CHAR_FILES=$(echo -n "$SPECIAL_CHAR_FILES" | sed '/^$/d')

if [ -n "$SPECIAL_CHAR_FILES" ]; then
    echo "특수문자 포함 파일 발견:"
    echo -n "$SPECIAL_CHAR_FILES"
    echo
fi

# 결과 종합
ALL_ISSUES_FOUND=false
if [ -n "$NON_UTF8_FILES" ] || [ -n "$SPECIAL_CHAR_FILES" ]; then
    ALL_ISSUES_FOUND=true
    echo "=== 인코딩/특수문자 문제 발견 ==="
    if [ -n "$NON_UTF8_FILES" ]; then
        echo "비 UTF-8 파일:"
        echo "$NON_UTF8_FILES"
    fi
    if [ -n "$SPECIAL_CHAR_FILES" ]; then
        echo "특수문자 포함 파일:"
        echo -n "$SPECIAL_CHAR_FILES"
    fi
    echo
    echo "인코딩 문제 해결 필요!"
    exit 1
else
    echo "=== 인코딩 문제 없음 ==="
    exit 0
fi