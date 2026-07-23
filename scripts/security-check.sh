#!/bin/bash

echo "=== Security Check ==="

# .env 파일에 실제 값이 있는지 확인
if [ -f ".env" ]; then
    env_vars=$(grep -c '=' .env)
    if [ $env_vars -gt 0 ]; then
        echo "PASS: .env 파일에 $env_vars 개의 환경 변수가 설정되어 있습니다."
    else
        echo "FAIL: .env 파일에 환경 변수가 없습니다."
    fi
else
    echo "INFO: .env 파일이 존재하지 않습니다."
fi

# .gitignore에 .env 포함 여부 확인
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore; then
        echo "PASS: .gitignore에 .env 파일이 포함되어 있습니다."
    else
        echo "FAIL: .gitignore에 .env 파일이 포함되어 있지 않습니다."
    fi
else
    echo "FAIL: .gitignore 파일이 존재하지 않습니다."
fi

echo "=== Security Check 완료 ==="