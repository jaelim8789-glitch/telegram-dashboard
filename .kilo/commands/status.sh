#!/bin/bash
# status: 전체 시스템 상태 출력

echo "=== Frontend (VPS) ==="
ssh root@130.94.30.112 "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep frontend"

echo ""
echo "=== Backend (기존 VPS) ==="
ssh root@130.94.32.152 \
  "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'backend|nginx|db'"

echo ""
echo "=== CI Status ==="
gh run list --workflow=deploy.yml --limit 3 --json conclusion,createdAt,headBranch,displayTitle

echo ""
echo "=== DNS ==="
dig +short app.telemon.online 2>/dev/null || echo "dig not available"
dig +short api.telemon.online 2>/dev/null || echo "dig not available"
