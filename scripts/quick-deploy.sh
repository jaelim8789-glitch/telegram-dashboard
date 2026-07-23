#!/bin/bash

echo "=== TeleMon 빠른 배포 스크립트 (GHCR pull 방식) ==="

echo "1. 최신 이미지 가져오기..."
docker pull ghcr.io/jaelim8789-glitch/telemon-frontend:latest

echo "2. 이미지 태그 변경..."
docker tag ghcr.io/jaelim8789-glitch/telemon-frontend:latest ghcr.io/telemon/telemon-frontend:latest

echo "3. Docker Compose로 프론트엔드 재시작..."
docker compose up -d --no-deps frontend

echo "4. nginx 재시작..."
docker compose restart nginx

echo "=== 배포 완료 ==="