# TeleMon Kilo 개발환경 — 50가지 꿀팁 참조표

## ⌨️ Kilo TUI 단축키 (Ctrl+X leader 기준)

| 키 | 기능 |
|----|------|
| `Ctrl+X t` | 테마 전환 (35+ themes) |
| `Ctrl+X m` | AI 모델 전환 |
| `Ctrl+X a` | 에이전트 전환 |
| `Ctrl+X n` | 새 세션 |
| `Ctrl+X l` | 세션 목록 |
| `Ctrl+X c` | 컨텍스트 압축 |
| `Ctrl+X u` | 실행 취소 |
| `Ctrl+X r` | 재실행 |
| `Ctrl+X y` | 마지막 응답 복사 |
| `Ctrl+X g` | 타임라인 이동 |
| `Ctrl+X h` | 코드 숨기기 토글 |
| `Ctrl+X b` | 사이드바 토글 |
| `Tab` | 에이전트 순환 |
| `Ctrl+R` | 세션 이름 변경 |
| `Ctrl+K` | 명령 팔레트 |

## 🤖 커스텀 에이전트 (10개)

| # | 에이전트 | 용도 |
|---|----------|------|
| 1 | `telemon-dev` | 주 개발 에이전트 (worktree + build) |
| 2 | `telemon-deployer` | 배포 전담 (merge → build → push → VPS) |
| 3 | `telemon-debugger` | 프로덕션 에러 진단 (Sentry + 로그) |
| 4 | `telemon-miniapp` | 텔레그램 미니앱 전용 |
| 5 | `telemon-backend` | FastAPI 백엔드 전용 |
| 6 | `telemon-reviewer` | 코드리뷰 (10가지 안티패턴 체크) |
| 7 | `telemon-tester` | 테스트 작성 (Jest + Playwright) |
| 8 | `ts-fixer` | 타입스크립트 에러만 수정 |
| 9 | `css-fixer` | Tailwind CSS만 수정 |
| 10 | `dead-code-cleaner` | 미사용 코드 제거 |

## 📋 슬래시 커맨드 (20개)

| # | 커맨드 | 설명 |
|---|--------|------|
| 11 | `/build-check` | 빌드+타입체크+린트 |
| 12 | `/fix-types` | tsc 에러 자동 수정 |
| 13 | `/deploy` | release worktree → master push → VPS 배포 |
| 14 | `/release` | 전체 릴리스 사이클 |
| 15 | `/clean-dead-code` | knip으로 dead code 제거 |
| 16 | `/dev-reset` | node_modules/.next 날리고 재설치 |
| 17 | `/auto-fix` | 인코딩/JSX/package.json 자동 체크 |
| 18 | `/merge-fix` | 충돌 해결 가이드 |
| 19 | `/review-all` | 커밋 전 전체 코드리뷰 |
| 20 | `/worktree-new` | 새 worktree 생성 + deps 설치 + dev 실행 |
| 21 | `/scan-bugs` | TeleMon 특화 10대 버그 스캔 |
| 22 | `/prod-health` | VPS + Sentry 상태 확인 |
| 23 | `/conflict-resolve` | 병합 충돌 해결 + 빌드 확인 |
| 24 | `/cleanup` | 머지된 브랜치/worktree 정리 |
| 25 | `/new-tab` | 새 워크스페이스 탭 추가 가이드 |
| 26 | `/weekly-report` | 주간 작업 리포트 생성 |
| 27 | `/code-health` | 코드 품질 분석 (중복, hotspot) |
| 28 | `/launch-checklist` | 출시 전 체크리스트 |
| 29 | `/qa` (npm) | `npm run qa` — 통합 품질 체크 |
| 30 | `/nuke` (npm) | `npm run nuke` — 완전 클린 설치 |

## 📦 Skills (2개)

| # | Skill | 내용 |
|---|-------|------|
| 31 | `telemon-patterns` | 개발 컨벤션, 안티패턴, 필수 규칙 |
| 32 | `telemon-component` | React 컴포넌트 패턴, 구조, 코드예시 |

## ⚙️ Kilo 설정 최적화 (8개)

| # | 항목 | 내용 |
|---|------|------|
| 33 | `default_agent: telemon-dev` | 기본 에이전트 지정 |
| 34 | `instructions: [AGENTS.md, DOCS/ONBOARDING.md]` | 세션 시작 시 자동 로드 |
| 35 | `compaction.auto: true` | 컨텍스트 자동 압축 |
| 36 | `compaction.prune: true` | 오래된 툴 출력 자동 정리 |
| 37 | `.kilo/setup-script.ps1` | worktree 생성 시 자동 .env 복사 + pnpm 설치 |
| 38 | `.kilo/run-script.ps1` | worktree dev 서버 자동 실행 (랜덤 포트) |
| 39 | `permission.edit: allow` | 자동 편집 허용 |
| 40 | `permission.bash: allow` | 자동 셸 실행 허용 |

## 🛠️ npm scripts / Git aliases (10개)

| # | 명령어 | 설명 |
|---|--------|------|
| 41 | `npm run qa` | tsc + lint + build 한 번에 |
| 42 | `npm run nuke` | node_modules + .next 삭제 후 재설치 |
| 43 | `npm run fresh` | 머지된 로컬 브랜치 정리 |
| 44 | `npm run fresh-remote` | 원격 stale 브랜치 정리 |
| 45 | `npm run dev` | `--turbo` 적용 (이미 설정됨) |
| 46 | `npm run tsc:watch` | 실시간 타입체크 |
| 47 | `npm run branch-status` | 모든 브랜치 머지 상태 확인 |
| 48 | `git wip` | 현재 작업 임시 커밋 |
| 49 | `git unwip` | 임시 커밋 되돌리기 |
| 50 | `git all "message"` | add + commit + push 한 번에 |

---

## 🔥 즉시 효과 보는 TOP 5

1. **`telemon-dev` 에이전트** — `/agents` → `telemon-dev` 선택 → 모든 작업에 AGENTS.md 규칙 자동 적용
2. **`/worktree-new`** — 한 번에 worktree 생성 + deps 설치 + dev 실행
3. **`npm run qa`** — tsc + lint + build 3종 세트 한 방
4. **`Ctrl+X m`** — AI 모델 빠른 전환 (code ↔ review ↔ plan)
5. **`/scan-bugs`** — 커밋 전 10대 버그 자동 스캔
