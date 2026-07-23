#!/bin/bash

echo "=== 최근 CI 실행 목록 ==="
gh run list --limit 5

echo ""
echo "=== 최신 CI 실행 로그 분석 ==="
LATEST_RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -n "$LATEST_RUN_ID" ]; then
  echo "최신 실행 ID: $LATEST_RUN_ID"
  
  echo ""
  echo "실패 로그 검색 중..."
  FAILED_LOGS=$(gh run view "$LATEST_RUN_ID" --log 2>/dev/null | grep -E 'Error\|error\|Failed\|failed\|FAILURE\|failure' | head -10)
  
  if [ -n "$FAILED_LOGS" ]; then
    echo "발견된 오류/실패 로그:"
    echo "$FAILED_LOGS"
    
    echo ""
    echo "=== CI 실패 원인 3줄 요약 ==="
    echo "$FAILED_LOGS" | head -3
  else
    echo "오류/실패 로그를 찾을 수 없습니다."
  fi
else
  echo "최신 실행을 찾을 수 없습니다."
fi