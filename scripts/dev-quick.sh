#!/bin/bash

echo "=== 개발 서버 시작 전 확인 ==="

# 포트 3000 확인
echo "포트 3000 확인 중..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "경고: 포트 3000이 이미 사용 중입니다. 다음 명령어로 종료할 수 있습니다:"
  echo "lsof -ti:3000 | xargs kill -9 2>/dev/null || netstat -ano | findstr :3000 (Windows)"
  read -p "계속하시겠습니까? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "포트 3000은 현재 사용 중이 아닙니다."
fi

# Git 상태 확인
echo "Git 상태 확인 중..."
if [ -z "$(git status --porcelain)" ]; then
  echo "Working directory is clean"
else
  echo "경고: 변경 사항이 아직 커밋되지 않았습니다:"
  git status --short
  read -p "계속하시겠습니까? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "=== 개발 서버 시작 ==="
echo "pnpm dev --turbo 실행 중..."

# 개발 서버 실행
pnpm dev --turbo