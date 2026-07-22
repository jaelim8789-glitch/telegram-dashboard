#!/bin/bash
# zero-downtime-deploy.sh — 무중단 배포: 새 컨테이너 실행 → 헬스체크 통과 → 트래픽 전환
set -euo pipefail

SERVICE="${1:-frontend}"
COMPOSE_FILE="${2:-docker-compose.yml}"
HEALTH_URL="${3:-http://localhost:3000/health}"
NEW_TAG="${4:-staging}"

echo "🚀 무중단 배포 시작: $SERVICE ($NEW_TAG)"

# 1. 새 이미지 pull
docker compose -f "$COMPOSE_FILE" pull "$SERVICE" -q

# 2. 새 컨테이너를 다른 포트로 실행 (health check 통과 확인용)
CURRENT_PORT=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}' \
  telemon-${SERVICE}-1 2>/dev/null || echo "3000")
NEW_PORT=$((CURRENT_PORT + 1))

docker compose -f "$COMPOSE_FILE" run -d --name telemon-${SERVICE}-new \
  --no-deps --rm -p "$NEW_PORT:3000" "$SERVICE"

# 3. 헬스체크
echo "⏳ 헬스체크 대기 중..."
for i in $(seq 1 12); do
  if curl -sf "http://localhost:$NEW_PORT/health" > /dev/null 2>&1; then
    echo "✅ 헬스체크 통과"
    # 4. 트래픽 전환 (nginx upstream 포트 변경)
    sed -i "s/server 127.0.0.1:$CURRENT_PORT/server 127.0.0.1:$NEW_PORT/g" /etc/nginx/conf.d/telemon.conf
    nginx -s reload
    # 5. 이전 컨테이너 정리
    docker stop telemon-${SERVICE}-1
    echo "✅ 무중단 배포 완료 — $CURRENT_PORT → $NEW_PORT"
    exit 0
  fi
  sleep 5
done

echo "❌ 헬스체크 실패 — 배포 중단, 이전 컨테이너 유지"
docker rm -f telemon-${SERVICE}-new 2>/dev/null || true
exit 1
