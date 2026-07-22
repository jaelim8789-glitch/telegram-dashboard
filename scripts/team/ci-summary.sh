#!/usr/bin/env bash
# CI 실패 자동 원인 요약
# 실행: scripts/team/ci-summary.sh [run-id]
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

RUN_ID="${1:-}"
if [ -z "$RUN_ID" ]; then
  # 가장 최근 실패한 run 찾기
  RUN_ID=$(gh run list --limit 10 --json databaseId,conclusion --jq '.[] | select(.conclusion=="failure") | .databaseId' 2>/dev/null | head -1)
fi

if [ -z "$RUN_ID" ]; then
  echo "❌ 실패한 CI run 없음"
  exit 0
fi

echo "🔍 분석: CI Run #$RUN_ID"
echo ""

# 실패한 job과 에러 메시지 추출
gh run view "$RUN_ID" --log --jq '.steps[] | select(.conclusion=="failure") | "❌ \(.name): \(.number)단계 실패"' 2>/dev/null || {
  gh run view "$RUN_ID" --log 2>/dev/null | grep -i "error\|Error\|FAIL\|❌" | head -20
}

echo ""
echo "--- 변경 파일 ---"
gh run view "$RUN_ID" --json headBranch,headSha 2>/dev/null | jq -r '.headSha' | xargs -I {} git diff --name-only "{}^..{}" 2>/dev/null | head -20

echo ""
echo "💡 자동 추론:"
echo "   위 파일 중 에러와 관련된 파일을 확인하세요."
