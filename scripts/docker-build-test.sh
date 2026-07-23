#!/bin/bash
# Docker build 테스트 스크립트
# Usage: ./scripts/docker-build-test.sh

echo "Docker 빌드 테스트 시작..."
echo "현재 시간: $(date)"

# Docker 빌드 실행 (캐시 사용 안 함)
docker build . --no-cache 2>&1 | tail -30

if [ $? -eq 0 ]; then
    echo "✅ Docker 빌드 성공!"
else
    echo "❌ Docker 빌드 실패!"
    exit 1
fi