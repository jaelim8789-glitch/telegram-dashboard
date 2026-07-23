# TeleMon Shared Agent Knowledge (all agents load this)

## MCP Priority by Task
- Bug fix: codebase-memory trace_path → postgres/redis 실데이터 → git log blame
- New feature: codebase-memory get_architecture → context7 docs → filesystem
- UI: playwright 스크린샷 → figma/penpot → 직접확인
- Deploy: git 상태확인 → docker 컨테이너 → github CI
- Analysis: sequential-thinking → codebase-memory search_graph → websearch

## Hotspot Files (절대 동시 편집 금지)
- src/components/workspace/tabs/SendTab.tsx
- src/lib/api.ts
- src/components/layout/Workspace.tsx
- src/components/layout/DashboardShell.tsx
- src/app/miniapp/MiniAppChat.tsx
- next.config.ts

## Common Mistakes Checklist (커밋 전 반드시 확인)
1. JSX is in .tsx file, NOT .ts
2. pnpm-lock.yaml committed together with package.json changes
3. git log HEAD..origin/master checked before push
4. npm run build passed
5. Badge/Panel doesn't have onClick/onTouch* — wrap in button/div
6. UTF-8 without BOM
7. No root app/ directory (shadows src/app/)

## Quick Commands
- Dev: npm run dev (--turbo auto)
- Build: npm run build
- Deploy: git push origin master (CI auto)
- Backend: cd telegram-dashboard-backend && git push origin master

## VPS 연결 정보
- Host: 130.94.32.152
- User: root
- SSH Key: C:\Users\UserC\.ssh\telemon_vps_ed25519
- Frontend: /opt/telemon/telegram-dashboard/
- Backend: /opt/telemon/backend/
- Docker: /opt/telemon/backend/docker-compose.yml
- GHCR: ghcr.io/jaelim8789-glitch/telemon-frontend:latest
- GitHub: jaelim8789-glitch/telegram-dashboard (PUBLIC)
