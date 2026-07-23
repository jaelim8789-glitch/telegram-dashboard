# TeleMon 개발속도 최적화 꿀팁

이 파일은 모든 Kilo 에이전트가 공유합니다 (`kilo.json` → instructions).
새 작업 시작 전에 반드시 로드됩니다.

## 작업 전 필수

- `git log HEAD..origin/master --oneline` — push 전 남의 커밋 확인 (충돌 방지)
- git worktree 격리 확인: `git rev-parse --git-dir`

## 배포 (20초)
```bash
ssh root@130.94.32.152 "cd /opt/telemon/backend && docker compose pull frontend && docker compose up -d --no-deps frontend && docker compose restart nginx"
```
더 이상 VPS에서 build 안 함 — GHCR pull만.

## CI 자동배포 활성화 (GitHub Secrets 필요)
Repo → Settings → Secrets → Actions:
- `VPS_HOST`: `130.94.32.152`
- `VPS_USER`: `root`
- `VPS_SSH_KEY`: `~/.ssh/telemon_vps_ed25519` 내용 전체

## 개발 스피드 팁

### 로컬 빌드 절대 하지 말 것
- `pnpm dev`만 쓰고, `next build`는 CI에게 맡김
- pre-push에서 verify(tsc+lint+build) 돌지 않음 — CI가 처리

### pnpm 속도
```bash
pnpm config set store-dir D:\.pnpm-store  # SSD 경로
pnpm approve-builds  # 한 번만 실행 (경고 제거)
```

### Git alias
```bash
git config alias.cm "commit -m"
git config alias.pushf "push --no-verify"
git config alias.lg "log --oneline --graph -20"
```

### gh alias
```bash
gh alias set prc "pr create --fill"
gh alias set prv "pr view --web"
```

## 핫스팟 파일 (절대 동시 편집 금지)
- `src/components/workspace/tabs/SendTab.tsx`
- `src/lib/api.ts`
- `src/components/layout/Workspace.tsx`
- `src/components/layout/DashboardShell.tsx`
- `src/app/miniapp/MiniAppChat.tsx`
- `next.config.ts`

## 파일 깨짐 방지
- `.ts` 파일에 JSX 넣지 말 것 → `.tsx` 사용
- 파일 저장 시 UTF-8 BOM 없음 확인
- `eventOptimization.tsx`, `useContextMenu.ts` 이미 깨져있음 — 수정 금지 (별도 정리 예정)

## MCP 그래프 (모든 에이전트 공유)

```
Kilo Agent (Kiro)
  ├── codebase-memory (코드검색/추적)
  ├── context7 (라이브러리문서)
  ├── git (히스토리/블레임)
  ├── postgres (DB직접쿼리)
  ├── redis (캐시/큐)
  ├── docker (컨테이너관리)
  ├── playwright (UI테스트)
  ├── github (PR/이슈)
  ├── filesystem (파일읽기)
  ├── fetch (URL요청)
  ├── sequential-thinking (복잡분석)
  └── memory (세션메모리)
```

순서: codebase-memory 우선 → git/postgres/redis 실데이터 → 나머지

## 기타
- .env.local은 `scripts/sync-worktree.sh`로 자동 복사
- 새 worktree: `bash scripts/sync-worktree.sh /path/to/new/worktree`
- 최초 1회: `bash scripts/speed-setup.sh`
