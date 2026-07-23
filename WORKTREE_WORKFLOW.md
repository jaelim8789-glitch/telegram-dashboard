# WORKTREE_WORKFLOW.md — TeleMon Worktree 운영 규칙

> 적용 대상: Claude Code, Kiro, Cline, OpenCode, Codex 및 향후 합류하는 모든 AI 에이전트 / 인간 개발자
> 적용 범위: `telegram-dashboard`(프론트엔드, 이 저장소) + `telegram-dashboard-backend`(백엔드, 별도 저장소)
>
> 이 문서와 [AGENTS.md](AGENTS.md)의 관계:
> - **[AGENTS.md](AGENTS.md) "Worktree-based workflow" 섹션이 MANDATORY 규칙의 정본입니다** — 워크트리·브랜치 매핑, 허용 작업, 위반 금지사항의 최종 기준.
> - **이 문서(WORKTREE_WORKFLOW.md)는 그 규칙의 상세 구현 참고서입니다** — "왜 이렇게 하는지", 브랜치 세부 전략, merge/release/deploy 절차의 단계별 설명을 담습니다.
> - 새 에이전트는 [DOCS/ONBOARDING.md](DOCS/ONBOARDING.md)에서 시작하세요(5분 요약). 배포 절차 세부사항이 AGENTS.md와 충돌할 경우 AGENTS.md를 우선합니다.

---

## 0. 전제: 두 개의 독립 저장소

- **프론트엔드**: `telegram-dashboard.git` — 이 저장소(`c:\Backups\emergency-20260718-211528\Dev\TeleMon`, 원본 워킹카피는 `c:\Dev\TeleMon`)
- **백엔드**: `telegram-dashboard-backend.git` — 형제 디렉터리 `telegram-dashboard-backend/`
- 두 저장소는 **커밋/푸시/배포를 독립적으로** 수행합니다. 한쪽 변경이 다른 쪽 커밋에 섞여 들어가지 않도록 항상 `git status`로 현재 어느 저장소에 있는지 확인합니다.
- 아래 규칙은 두 저장소 모두에 동일하게 적용됩니다.

---

## 1. Worktree 구조

### 1.1 운영 워크트리 (Operational — AGENTS.md MANDATORY 구조)

실제 운영 중인 구조입니다(`git worktree list` 기준, 상시 최신 상태 유지 필요):

| Worktree | 경로 | 브랜치 | 허용 작업 |
|---|---|---|---|
| **TeleMon** (parent) | `c:\Dev\TeleMon`* | `master` | 없음 — 참조 전용, 이 워크트리에서 개발 금지 |
| **TeleMon-release** | `c:\Dev\TeleMon-release` | `worktree/release` | merge, test, build, deploy만 |
| **TeleMon-cline** | `c:\Dev\TeleMon-cline` | `worktree/cline` | develop, commit, push만 |
| **TeleMon-opencode** | `c:\Dev\TeleMon-opencode` | `worktree/opencode` | develop, commit, push만 |
| **TeleMon-kiro** | `c:\Dev\TeleMon-kiro` | `worktree/kiro` | develop, commit, push만 |
| TeleMon-codex | (future) | `worktree/codex` | develop, commit, push만 |

\* 긴급 백업/복구 세션 중에는 parent가 `c:\Backups\emergency-*\Dev\TeleMon`에 위치할 수 있습니다(현재 세션 기준). 이 경우에도 `TeleMon-release`/`-cline`/`-opencode`/`-kiro`는 `c:\Dev\TeleMon-*`의 정본 워크트리를 그대로 사용합니다 — parent 위치와 무관하게 하나만 존재합니다.

- **Claude Code**는 고정 워크트리가 없습니다 — 주로 `TeleMon-release`에서 merge/test/deploy 오케스트레이션을 수행하고, 필요 시 parent에서 읽기 전용 조사를 하거나 격리 워크트리(§1.2)로 실험합니다.
- 각 개발 워크트리의 브랜치(`worktree/<agent>`)는 해당 에이전트의 **고정 홈 브랜치**입니다. 일상적인 개발/커밋은 이 브랜치에 직접 쌓고, 별도 PR 리뷰가 필요한 대형 작업만 `feat/*`(§3)로 분기합니다.
- `master`는 항상 **프로덕션과 최대한 가깝게** 유지합니다(§7 참고). `worktree/release`가 merge/test를 마친 결과가 `master`로 반영됩니다.

### 1.2 에이전트별 격리 워크트리 (Isolated, 운영 워크트리와 별개)
```
<repo>/.kilo/worktrees/<slug>/         ← Kilo Code 전용, .gitignore 처리됨
<tmp>/claude/<repo-hash>/<session>/scratchpad/<name>/   ← Claude Code isolation:"worktree" 세션 전용
```
- 격리 워크트리는 **실험/일회성 검증용**이며 §1.1의 운영 워크트리를 대체하지 않습니다. Kilo Code는 현재 운영 로스터(AGENTS.md)에는 없지만, 과거 산출물 정리 및 임시 실험 용도로 이 경로가 남아있을 수 있습니다.
- 격리 워크트리에서 만든 변경을 운영 워크트리에 반영하려면 반드시 **branch → push → PR/merge** 경로를 거칩니다. 워크트리 디렉터리를 직접 복사하거나 정본에 덮어쓰지 않습니다.
- 세션/작업이 끝난 격리 워크트리는 정리합니다: `git worktree remove <path>` (강제 삭제가 필요하면 `--force`를 쓰기 전에 반드시 미커밋 변경이 없는지 확인).
- `git worktree list`에 `prunable`로 뜨는 항목(경로가 이미 사라진 워크트리)은 `git worktree prune`으로 정리합니다. **단, prune 전에 해당 브랜치에 유효한 커밋이 있는지(`git log <branch>`) 반드시 확인합니다** — 브랜치 자체는 지우지 않습니다.

### 1.3 워크트리 생성 규칙
- 워크트리는 항상 **브랜치와 1:1**로 생성합니다: `git worktree add <path> <branch>` 또는 신규 브랜치는 `git worktree add -b <branch> <path>`.
- 워크트리 경로에 개인 식별 정보나 절대 다회용 경로(예: `C:\Users\<개인계정>\...`)를 하드코딩한 스크립트/문서를 커밋하지 않습니다.
- 같은 브랜치를 두 워크트리에서 동시에 checkout할 수 없다는 git 제약을 인지하고, 브랜치명은 작업 단위로 고유하게 생성합니다.

---

## 2. AI별 역할

> 기능/파일 단위로 어느 AI가 무엇을 맡는지 구체적인 매핑과 충돌 위험 파일 목록은 [docs/PARALLEL_DEVELOPMENT.md](docs/PARALLEL_DEVELOPMENT.md) 참고. 아래는 워크트리 단위의 역할 요약입니다.

| 에이전트 | 역할 | 전용 워크트리 |
|---|---|---|
| **Claude Code** | Merge/Test/Deploy 오케스트레이션, 디버깅, 배포. MCP-first 원칙(AGENTS.md §Core rule) 적용. 서브에이전트(Explore 등)로 대규모 탐색을 위임. | `TeleMon-release` (필요 시 parent에서 읽기 전용 조사) |
| **Cline** | VS Code 내 인라인 편집/리팩터링/기능 개발. | `TeleMon-cline` |
| **OpenCode** | 기능 개발. | `TeleMon-opencode` |
| **Kiro** | 스펙(spec) 기반 작업 분해 및 구현. | `TeleMon-kiro` |
| **Codex** | (합류 예정) 기능 개발. | `TeleMon-codex` |

공통 원칙:
- 모든 에이전트는 [AGENTS.md](AGENTS.md)의 MCP 우선순위표와 §1.1의 "허용 작업"을 따릅니다.
- **자신에게 할당된 워크트리 외에는 수정하지 않습니다.** 다른 에이전트의 워크트리/브랜치에 커밋이 필요하면 먼저 그 에이전트(또는 사용자)와 조율합니다.
- 개발 워크트리(Cline/OpenCode/Kiro/Codex)는 merge, rebase, deploy를 수행하지 않습니다 — 이는 `TeleMon-release`(Claude Code)의 역할입니다.
- 어떤 에이전트가 작업 중이든 **프로덕션 배포 커밋은 사용자 확인 없이 임의로 만들지 않습니다** (§8 금지사항).

---

## 3. Branch 전략

기존 저장소 관례를 표준화합니다.

| 접두어 | 용도 | 베이스 | 머지 대상 |
|---|---|---|---|
| `worktree/<agent>` | 개발 워크트리의 고정 홈 브랜치(§1.1). 일상적 커밋을 직접 쌓는 곳 | `master` | `worktree/release`에서 merge/test 후 `master` |
| `feat/<slug>` | 리뷰가 필요한 대형 신규 기능(개발 워크트리 안에서 분기) | `master` | `master` (PR) |
| `feature/<slug>` | 신규 기능(레거시 표기, 신규 작업은 `feat/` 권장) | `master` | `master` (PR) |
| `fix/<slug>` | 버그 수정 | `master` | `master` (PR) |
| `hotfix/<slug>` | 프로덕션 긴급 수정 | `master` (또는 배포된 태그) | `master` 직접 머지 가능, 배포 후 즉시 |
| `integrate/<slug>` | 여러 feature/fix 브랜치를 합쳐 검증하는 통합 브랜치 | 대상 feature 브랜치들 | `master` (검증 완료 후) |
| `release-<YYYYMMDD>` | 특정 일자 릴리스 스냅샷 | `master` | 배포 소스, 이후 태그 |
| `release-rc-<n>` | 릴리스 후보 | `master` 또는 `release-*` | QA 통과 시 `release-<date>`로 승격 |

규칙:
- `master`에서 직접 분기합니다. 오래된 `feat/*`에서 새 `feat/*`를 분기하지 않습니다(스택 브랜치 금지 — 리베이스 충돌 방지).
- 슬러그는 kebab-case, 티켓/이슈 번호가 있으면 포함합니다(예: `feat/17-message-preview`).
- 3개월 이상 미갱신된 원격 브랜치는 머지 여부를 사용자에게 확인 후 정리 대상으로 표시합니다(임의 삭제 금지).

---

## 4. Commit / Push 규칙

- **커밋 메시지**: `<type>: <설명>` 형식을 따릅니다. 관측된 타입: `feat`, `fix`, `chore`, `docs`, `sync`, `refactor`, `test`. 메시지는 "무엇을" 보다 가능하면 "왜"를 담습니다.
- **커밋 단위**: 관련 없는 변경을 한 커밋에 섞지 않습니다. 프론트/백엔드 변경은 각 저장소에서 **별도 커밋**으로 만듭니다(AGENTS.md §New feature development 3항).
- **Push 전 확인**:
  1. `git status`로 현재 저장소/브랜치를 확인.
  2. `git log origin/<branch>..HEAD`로 push하려는 커밋을 정확히 확인 — 의도치 않은 커밋이 섞이지 않았는지 검토.
  3. 관련 테스트(`pytest` / `tsc --noEmit` + 기존 스위트)를 실행하고 통과 확인.
- **금지**: `--force` push는 원칙적으로 금지. 예외적으로 필요한 경우(자신만 사용 중인 feature 브랜치의 리베이스 정리 등) 반드시 사용자 승인 후 `--force-with-lease`를 사용합니다. `master`/`release-*`/`integrate/*`에는 force push를 절대 하지 않습니다.
- **훅 우회 금지**: `--no-verify`, `--no-gpg-sign` 등은 사용자가 명시적으로 요청한 경우가 아니면 사용하지 않습니다.
- 커밋 전 `git status`로 스테이징된 파일을 재확인하고, `.env`/세션 파일/자격 증명이 포함되지 않았는지 확인합니다(`.gitignore`에 `*.session`, `.env*`, `data/` 등이 이미 포함되어 있으나 신규 경로는 재확인 필요).

---

## 5. Merge 규칙

- 기본 경로는 **PR 기반 머지**입니다(`github` MCP 또는 `gh` CLI 사용). `feat/*`, `fix/*`, `feature/*` → `master`는 PR을 통해서만 머지합니다.
- 여러 브랜치를 한 번에 합칠 때는 `integrate/*` 브랜치를 만들어 먼저 충돌/회귀를 검증한 뒤, 검증된 `integrate/*`를 `master`로 머지합니다. 개별 feature 브랜치를 검증 없이 `master`에 직접 순차 머지하지 않습니다.
- `hotfix/*`는 예외적으로 최소 리뷰(자체 테스트 + 사용자 확인)로 `master`에 직접 머지할 수 있으나, 머지 후 반드시 정식 리뷰가 필요한지 사용자에게 보고합니다.
- 머지 전 체크리스트:
  - [ ] 대상 저장소의 테스트 스위트 통과
  - [ ] `master` 기준으로 리베이스/머지하여 충돌 해결 완료
  - [ ] 변경 범위가 PR 설명과 일치(관련 없는 파일 diff 없음)
- 머지 방식은 저장소 히스토리를 유지하는 **일반 머지(merge commit)** 를 기본으로 하며, 단일 논리 변경으로 squash가 더 명확한 경우에만 squash-merge를 사용합니다.

---

## 6. Release 규칙

- 릴리스는 `master`에서 `release-<YYYYMMDD>` 브랜치를 잘라 시작합니다.
- 안정화가 더 필요하면 `release-rc-<n>` 브랜치에서 버그 수정을 반복하고, QA 통과 후 `release-<YYYYMMDD>`로 승격(머지 또는 리네임)합니다.
- 릴리스 브랜치에서 발견된 수정은 **`master`로도 반드시 back-merge**합니다(릴리스 전용 수정이 `master`에서 유실되지 않도록).
- 릴리스가 배포되면 해당 커밋에 태그를 남깁니다(예: `git tag v2026.07.19`). 태그는 배포된 정확한 커밋 SHA를 가리켜야 합니다.
- 프론트엔드/백엔드는 릴리스 버전을 독립적으로 관리하되, 동시 배포가 필요한 변경(API 계약 변경 등)은 릴리스 노트에 상호 참조를 남깁니다.

---

## 7. Deploy 절차

프로덕션은 VPS 1대(Docker Compose, `130.94.32.152`, SSH alias `telemon-vps`)에서 `api.telemon.online` / `app.telemon.online`으로 서비스됩니다. **AGENTS.md의 "Production deployment" 섹션이 정본**이며, 여기서는 worktree 관점만 보강합니다.

1. **워크트리 확정**: 배포는 반드시 `TeleMon-release`(`worktree/release` 브랜치, §1.1)에서만 수행합니다. 개발 워크트리(`TeleMon-cline`/`-opencode`/`-kiro`)나 격리 워크트리(`.kilo/worktrees/*`, scratchpad)에서 직접 배포하지 않습니다 — 개발 워크트리는 먼저 자신의 `worktree/<agent>` 브랜치를 push하고, `TeleMon-release`에서 pull/merge합니다.
2. 배포 대상 저장소에서 전체 테스트 스위트 실행, red 상태에서 배포하지 않습니다.
3. `git log origin/master..HEAD`로 배포될 커밋을 정확히 특정하고, 승인되지 않은 작업이 섞이지 않았는지 확인합니다.
4. 해당 저장소(frontend: `telegram-dashboard.git` / backend: `telegram-dashboard-backend.git`)의 `origin/master`에 push합니다.
5. VPS에서 `/opt/telemon/telegram-dashboard`(프론트) 또는 `/opt/telemon/backend`(백엔드, git remote 오설정 이슈 있음 — AGENTS.md §4 참고)에서 pull.
6. 영향받은 컨테이너만 재빌드/재기동: `docker compose build <service> && docker compose up -d --no-deps <service>`.
7. 컨테이너 헬스, 기동 로그, 실제 도메인 대상 HTTP 체크(Host 헤더 포함)로 검증.
8. **배포된 커밋 SHA를 VPS와 로컬 양쪽에서 확인**하고 사용자에게 보고합니다 — 이 저장소에서 확립된 습관(`git rev-parse HEAD`를 VPS/로컬 양쪽에서 비교)을 유지합니다.

---

## 8. 금지사항

- **`master`/`release-*`/`integrate/*`에 force push 금지.** 예외 없음(사용자가 명시적으로, 그리고 구체적으로 요청한 경우만 별도 승인 후 진행).
- **정본 워크트리와 격리 워크트리를 혼동해서 배포하지 않는다.** `.kilo/worktrees/*`나 scratchpad 워크트리는 실험용이며 프로덕션 배포 소스가 아니다.
- **다른 에이전트/세션이 소유한 브랜치나 워크트리에 사전 조율 없이 커밋하지 않는다.**
- **관련 없는 변경을 배포 push에 번들링하지 않는다** (AGENTS.md §Production deployment 2항).
- **미검증 상태로 `integrate/*` 없이 다수 feature 브랜치를 연쇄 머지하지 않는다.**
- **`git worktree remove --force` 또는 워크트리 디렉터리 직접 삭제(`rm -rf`) 전 미커밋 변경 확인 없이 실행하지 않는다.**
- **훅 우회(`--no-verify`), 서명 우회(`--no-gpg-sign`), `git reset --hard`, `git clean -fd`, `git checkout --`/`restore` 등 파괴적 명령을 사용자 승인 없이 실행하지 않는다.** 실행 전 반드시 `git status`로 대상 워크트리 상태를 확인한다.
- **프론트엔드/백엔드 커밋을 한 저장소인 것처럼 섞지 않는다.** 두 저장소는 항상 독립적으로 커밋/푸시한다.
- **VPS 배포 전 로컬 테스트를 생략하지 않는다.** Red 상태 배포 금지.
- **배포 완료를 SHA 확인 없이 "완료"로 보고하지 않는다.**
- **비밀값(.env, 세션 파일, API 키, DB 크리덴셜)을 커밋하거나 워크트리 간 무심코 복사하지 않는다.**

---

## 부록: 자주 쓰는 명령

```bash
# 개발 워크트리에서 리뷰용 feature 브랜치 분기 (예: TeleMon-cline 안에서)
git worktree add -b feat/example ../telemon-worktrees/feat-example worktree/cline

# 워크트리 목록/정리
git worktree list
git worktree prune
git worktree remove <path>

# 배포 전 diff 확인
git log origin/master..HEAD --oneline

# 프로덕션 배포 커밋 확인 (VPS)
ssh telemon-vps "cd /opt/telemon/telegram-dashboard && git rev-parse HEAD"
```
