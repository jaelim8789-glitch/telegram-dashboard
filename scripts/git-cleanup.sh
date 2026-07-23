#!/bin/bash

echo "=== Git 브랜치 정리 스크립트 ==="

echo "1. 로컬에서 머지된 브랜치 삭제 중..."
git branch --merged | grep -v "\*\|master\|main" | xargs -n 1 git branch -d 2>/dev/null || true

echo "2. 원격 브랜치 정보 갱신 중..."
git remote prune origin

echo "3. 머지되지 않은 브랜치 목록:"
git branch -v | grep -v "\*\|master\|main" | grep -E "^\w" || echo "머지되지 않은 브랜치가 없습니다."

echo "=== Git 정리 완료 ==="
