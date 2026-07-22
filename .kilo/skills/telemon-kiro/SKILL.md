---
name: telemon-kiro
description: Kiro 전용 TeleMon 풀스택 에이전트 — MCP 그래프, 워크플로, 패턴, 명령 레퍼토리
---

# TeleMon Kiro Skill

## 📡 MCP 그래프 (연결 다이어그램)

```
                    ┌─────────────────────┐
                    │   Kilo Agent (Kiro)  │
                    └──────┬──────┬───────┘
                           │      │
            ┌──────────────┘      └──────────────┐
            ▼                                     ▼
   ┌────────────────┐                  ┌──────────────────┐
   │  codebase-memory│                  │   context7        │
   │  (코드검색/추적) │                  │  (라이브러리 문서)  │
   └────────┬───────┘                  └──────────────────┘
            │
    ┌───────┼───────────┬──────────────────┐
    ▼       ▼           ▼                  ▼
┌────────┐ ┌────────┐ ┌────────┐     ┌──────────┐
│  git   │ │postgres│ │ redis  │     │ filesystem│
│(히스토리)│ │(DB직접)│ │(캐시)  │     │(파일읽기)  │
└────────┘ └────────┘ └────────┘     └──────────┘
    │
    └── github ── docker ── playwright ── sequential-thinking
```

### MCP 우선순위 (작업별)

| 작업 | 1순위 | 2순위 | 3순위 |
|------|-------|-------|-------|
| 버그 수정 | `codebase-memory` trace_path | `postgres`/`redis` 실데이터 | `git log` blame |
| 새 기능 | `codebase-memory` get_architecture | `context7` 라이브러리문서 | `filesystem` config |
| UI 작업 | `playwright` 스크린샷 | `figma`/`penpot` 디자인 | 직접 확인 |
| 배포 | `git` 상태확인 | `docker` 컨테이너 | `github` CI |
| 분석 | `sequential-thinking` | `codebase-memory` search_graph | `websearch` |

### 활성화된 MCP 목록 (`.mcp.json` 기준)
```
codebase-memory  → npx codebase-memory-mcp        # 코드 검색/추적 최우선
playwright       → @playwright/mcp                 # UI 테스트/스크린샷
docker           → mcp/docker:latest               # 컨테이너 관리
git              → mcp-server-git                  # 히스토리/블레임
context7         → @upstash/context7-mcp            # 라이브러리 실시간 문서
filesystem       → server-filesystem                # 파일 읽기
fetch            → mcp-server-fetch                 # URL 요청
github           → github-mcp-server                # PR/이슈 관리
graphiti         → streamableHttp localhost:8001     # 지식 그래프
memory           → server-memory                    # 세션 메모리
sequential-thinking → server-sequential-thinking    # 복잡한 문제 분석
postgres         → mcp-postgres-server              # DB 직접 쿼리
redis            → server-redis-mcp                 # 캐시/큐 확인
```

## 🎯 Kiro 워크플로 — 병렬 실행 패턴

### 패턴 1: "CTO 명령 실행"
```
당신(CEO) → Kilo CTO (전략/분석만)
                ↓
           Kiro (직접 실행)
                ↓
      ┌──────┬──────┬──────┐
      build  deploy  commit
```

### 패턴 2: "멀티 워크트리 병렬"
```
Kiro
  ├─ worktree/kiro (main development)
  │   └─ feat/branch-name
  ├─ TeleMon-release (deploy only)
  │   └─ worktree/release
  └─ TeleMon-opencode (sub-agent)
      └─ worktree/opencode
```

### 패턴 3: "핫픽스 긴급 처리"
```
1. worktree add → 2. fix → 3. merge to master → 4. push → 5. CI→VPS
```

## 🚀 자주 쓰는 명령어 레퍼토리

### Worktree
```bash
# 새 작업 시작
git worktree add .kilo/worktrees/feat-name origin/master -b feat/name

# 상태 확인
git worktree list
git status --short

# 완료 후 정리
git worktree remove .kilo/worktrees/feat-name
git branch -d feat/name
```

### Deploy (자동 — push만 하면 끝)
```bash
git push origin master   # CI → GHCR build → VPS pull → restart
```

### Backend (별도 repo)
```bash
cd telegram-dashboard-backend
git checkout master
git merge feat/branch-name
git push origin master   # CI → GHCR build → VPS pull → restart
```

### 브랜치 정리
```bash
git branch -d <merged-branch>
git branch -D <abandoned-branch>
git push origin --delete <remote-branch>
```

## ⚠️ 핫스팟 파일 (절대 동시 편집 금지)
- `src/components/workspace/tabs/SendTab.tsx`
- `src/lib/api.ts`
- `src/components/layout/Workspace.tsx`
- `src/components/layout/DashboardShell.tsx`
- `src/app/miniapp/MiniAppChat.tsx`
- `next.config.ts`

## 🔥 공통 실수 체크리스트 (커밋 전에 반드시 확인)
- [ ] `.ts` 파일에 JSX 없음?
- [ ] `pnpm-lock.yaml` 함께 커밋?
- [ ] 패키지 추가 시 `pnpm install --no-frozen-lockfile` 실행?
- [ ] `git log HEAD..origin/master` 확인?
- [ ] `Badge`/`Panel`에 `onClick`/`onTouch*` 안 붙임?
- [ ] `@tma.js/sdk-react`는 lazy import?
- [ ] UTF-8 BOM 없음?
- [ ] 작업 후 `npm run build` 통과?
- [ ] root `app/` 디렉토리 생기지 않았음?

## 📁 저장소 구조 (주요 디렉토리)
```
src/
  app/          → Next.js App Router pages
  components/
    ui/         → 재사용 UI 컴포넌트 (Button, Badge, Modal, Toast)
    workspace/  → 워크스페이스 레이아웃
      tabs/     → 각 탭 컴포넌트 (SendTab, DashboardTab, ...)
    layout/     → DashboardShell, Sidebar, Header
    landing/    → 랜딩 페이지 섹션
  hooks/        → 커스텀 훅
  lib/          → 유틸리티, API 클라이언트
    constants/  → 상수 (plans.ts 등)
  store/        → Zustand 스토어
  types/        → TypeScript 타입 정의

telegram-dashboard-backend/  → 별도 Git repo (FastAPI)
  app/
    api/        → FastAPI 라우터
    models/     → SQLAlchemy 모델
    services/   → 비즈니스 로직
    core/       → 설정, 보안, rate limiter
  alembic/      → DB 마이그레이션
  tests/        → pytest 테스트
```

## 📦 스택
- Frontend: Next.js 15 (App Router) + React 18 + Tailwind v4 + Zustand + Framer Motion
- Backend: FastAPI + SQLAlchemy + PostgreSQL + Redis + Telethon
- Deploy: Docker Compose + GHCR + VPS 130.94.32.152
- Package manager: pnpm only (절대 npm 사용 금지)
