#!/bin/bash
# Encoding check script -- also available as encoding-check.ps1 for Windows
# WINDOWS USERS: Run "powershell -File scripts/encoding-check.ps1" instead

echo "=== 인코딩 문제 검사 ==="

# Detect OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "Windows detected. Please run: powershell -File scripts/encoding-check.ps1"
    echo "Or use: find . -type f \( -name \"*.ts\" -o -name \"*.tsx\" \) -exec file {} \; | grep -i \"utf-16\""
    exit 0
fi

# UTF-16 파일 찾기
echo "UTF-16 파일 검사 중..."
utf16_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" -o -name "*.txt" \) -exec file {} \; | grep -i "utf-16" | cut -d: -f1)

if [ -n "$utf16_files" ]; then
    echo "UTF-16 파일 발견:"
    echo "$utf16_files"
    echo
    
    read -p "자동 변환하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for file in $utf16_files; do
            echo "UTF-16 파일 변환 중: $file"
            iconv -f UTF-16 -t UTF-8 "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        done
        echo "UTF-16 파일 변환 완료"
    fi
else
    echo "UTF-16 파일 없음"
fi

# ISO-8859/Latin-1 파일 찾기
echo "ISO-8859/Latin-1 파일 검사 중..."
iso_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" -o -name "*.txt" \) -exec file {} \; | grep -i "iso-8859\|latin" | cut -d: -f1)

if [ -n "$iso_files" ]; then
    echo "ISO-8859/Latin-1 파일 발견:"
    echo "$iso_files"
    echo
    
    read -p "자동 변환하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for file in $iso_files; do
            echo "ISO-8859/Latin-1 파일 변환 중: $file"
            iconv -f ISO-8859-1 -t UTF-8 "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        done
        echo "ISO-8859/Latin-1 파일 변환 완료"
    fi
else
    echo "ISO-8859/Latin-1 파일 없음"
fi

echo "=== 인코딩 검사 완료 ==="
