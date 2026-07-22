#!/bin/bash
# rollback-deploy.sh — 배포 실패 시 이전 정상 이미지로 원클릭 롤백
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.yml}"
SERVICE="${2:-frontend}"
LABEL="staging"

# 롤백 대상 태그 추출 (이전 SHA)
PREVIOUS_SHA=$(docker images --format "{{.Tag}}" ghcr.io/jaelim8789-glitch/telemon-${SERVICE} | grep -v "$LABEL" | grep -v "latest" | head -2 | tail -1)

if [ -z "$PREVIOUS_SHA" ]; then
  echo "❌ 이전 이미지를 찾을 수 없습니다."
  exit 1
fi

echo "🔄 롤백: $SERVICE → $PREVIOUS_SHA"

docker tag ghcr.io/jaelim8789-glitch/telemon-${SERVICE}:$PREVIOUS_SHA \
  ghcr.io/jaelim8789-glitch/telemon-${SERVICE}:$LABEL

docker compose -f "$COMPOSE_FILE" up -d --no-deps "$SERVICE"

# 헬스체크 대기
for i in $(seq 1 12); do
  if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo "✅ 롤백 완료 — $SERVICE 정상 동작 중"
    exit 0
  fi
  sleep 5
done

echo "❌ 롤백 실패 — 헬스체크 응답 없음"
exit 1
