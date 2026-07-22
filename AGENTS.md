# AGENTS.md — TeleMon AI Agent Workflow

Applies to Claude Code, Kiro, Cline, OpenCode, and Codex (and any other AGENTS.md-compliant agent) working in this repository.

**New to this project? Start at [DOCS/ONBOARDING.md](DOCS/ONBOARDING.md)** — a 5-minute path to your first commit. This file is the MANDATORY rule set; [WORKTREE_WORKFLOW.md](WORKTREE_WORKFLOW.md) is the detailed reference (branch strategy rationale, merge/release/deploy steps, appendix commands) for the rules below.

## Worktree-based workflow (MANDATORY)

**Every agent MUST work in its own Git Worktree.** Never modify code in the wrong worktree. See [WORKTREE_WORKFLOW.md §1–2](WORKTREE_WORKFLOW.md#1-worktree-구조) for the full structure rationale and per-agent role detail.

| Worktree | Path | Branch | Allowed operations |
|---|---|---|---|
| **TeleMon-release** | `c:\Dev\TeleMon-release` | `worktree/release` | merge, test, build, deploy only |
| **TeleMon-cline** | `c:\Dev\TeleMon-cline` | `worktree/cline` | develop, commit, push only |
| **TeleMon-opencode** | `c:\Dev\TeleMon-opencode` | `worktree/opencode` | develop, commit, push only |
| **TeleMon-kiro** | `c:\Dev\TeleMon-kiro` | `worktree/kiro` | develop, commit, push only |
| TeleMon-codex | (future) | `worktree/codex` | develop, commit, push only |

### Rules

1. **Release Worktree (`TeleMon-release`):** merge, test, build, deploy만 수행
2. **개발 Worktree (`TeleMon-cline`, `TeleMon-opencode`, `TeleMon-kiro`, `TeleMon-codex`):** 개발, commit, push만 수행
3. **자신의 Worktree 외 수정 금지** — 다른 agent의 worktree를 건드리지 않는다
4. **merge, rebase, deploy 금지** — 개발 worktree에서는 절대 수행하지 않는다
5. **개발 완료 시:** commit → push → commit hash만 보고
6. **배포는 TeleMon-release Worktree에서만 수행**

브랜치 명명(`worktree/<agent>`, `feat/*`, `release-*` 등), merge 체크리스트, 금지사항 전체 목록은 [WORKTREE_WORKFLOW.md](WORKTREE_WORKFLOW.md)에 있습니다 — 여기서 반복하지 않습니다.

## Repo layout

- `c:\Dev\TeleMon` (this root) — Next.js frontend. **Git worktree parent repo only. Do NOT develop here.**
- `telegram-dashboard-backend/` — FastAPI backend. **Separate git repo**: `telegram-dashboard-backend.git`. Commit and push it independently of the frontend.
- Git worktrees are at `c:\Dev\TeleMon-*` — see the table above. Always use the appropriate worktree.
- Current workspace: `C:\Backups\emergency-20260718-211528\Dev\TeleMon` (emergency session; see [WORKTREE_WORKFLOW.md §1.1](WORKTREE_WORKFLOW.md#1-worktree-구조) footnote for how this interacts with the canonical `c:\Dev\TeleMon-*` worktrees).
- Production is a single VPS running Docker Compose (`api.telemon.online`, `app.telemon.online`) — **not** Render, despite `render.yaml` existing in the backend repo. See Production deployment below.

## Core rule: MCP-first

Before asking the user to paste code, logs, error output, or documentation:

1. Try the relevant MCP tool first (see priority tables below).
2. Only ask the user when no MCP can supply it — e.g. it needs credentials/access you don't have, a visual judgment call, or a product decision.

Never guess at file contents, API shapes, DB state, or library behavior when an MCP can answer directly.

## MCP priority by task type

**Development** (writing/exploring code)
1. `codebase-memory-mcp` — `search_graph` / `trace_path` / `get_code_snippet` / `get_architecture`. Index the project first if not yet indexed (`index_status` → `index_repository`).
2. `context7` — current docs for any library in play (Next.js, FastAPI, SQLAlchemy, etc.) instead of relying on training-data memory.
3. `filesystem` / native file tools — non-code files (configs, markdown, migrations).
4. `git` / `github` — history, blame, diff context, PR/issue management.

**Debugging**
1. `codebase-memory-mcp` `trace_path` (calls / data_flow) — trace the real call chain before speculating.
2. `postgres` — query actual DB state directly instead of asking the user to paste rows.
3. `redis` — inspect actual cache/queue state directly.
4. `git log` / `git blame` — find when a bug was introduced.
5. `playwright` — reproduce a frontend bug live instead of asking the user to describe it.
6. `docker` — inspect container health, logs, and image state when the bug is container-bound.
7. Only after 1–6: ask for logs/screenshots nothing else can retrieve (e.g. VPS-only production logs).

**Testing**
1. `playwright` — drive the real frontend for UI/e2e verification.
2. Native test runners via Bash (`pytest` for the backend, `tsc --noEmit` + the existing suite for the frontend) — always run before declaring a fix or feature done.
3. `codebase-memory-mcp` — find existing tests covering the changed path before writing new ones; avoid duplicate coverage.

**UI/UX work**
1. `figma` / `penpot` — pull the actual design source of truth instead of guessing layout, spacing, or color.
2. `shadcn`, `magicui`, `lucide-icons` — real component/icon APIs and install commands instead of hand-rolling or guessing props.
3. `context7` — Tailwind/Next.js/React docs.
4. `playwright` — screenshot the rendered result and compare against the design before calling it done.

## Workflows

### Bug fixing
1. Reproduce: `codebase-memory-mcp` to trace the symptom to the responsible code path; `postgres`/`redis`/`playwright` to confirm actual state instead of assuming.
2. Find root cause, not a symptom patch — identify *why* (e.g. the reply-macro 422 was a FastAPI param-shape bug, not a validation bug).
3. Fix with a minimal diff.
4. Add or extend a regression test for the exact failure mode.
5. Run the full relevant suite, not just the new test.
6. Report root cause, files changed, and test results — never claim "fixed" without a passing verification.

### New feature development
1. `codebase-memory-mcp` (`get_architecture` + `search_graph`) to find where the feature belongs and what existing pattern to follow — don't introduce a second way of doing something the codebase already does one way.
2. `context7` for the current API of any library involved.
3. Implement backend (`telegram-dashboard-backend/`) and frontend (`src/`) changes as separate, minimal commits per repo — they are independent repos and deploy independently.
4. Write tests alongside the feature, not after.
5. Verify end-to-end before reporting done.

### UI/UX improvements
1. Pull the design (`figma`/`penpot`) — don't work from memory of a screenshot.
2. Reuse existing project components/tokens first; only reach for `shadcn`/`magicui`/`lucide-icons` when the project has no equivalent yet.
3. Implement, then use `playwright` to screenshot the real rendered page and compare against the design.
4. Check light/dark and mobile/desktop wherever the project supports them.

### Production deployment
1. Run the full test suite for whichever repo changed. Do not deploy on red tests.
2. Confirm exactly which local commits are ahead of `origin/master` before pushing. **Never bundle unrelated, not-yet-approved work into a deploy push** — confirm scope with the user if unsure.
3. Push only the intended commit(s) to the correct GitHub repo (frontend: `telegram-dashboard.git`, backend: `telegram-dashboard-backend.git`).
4. On the VPS, the live stack is driven entirely from `/opt/telemon/backend/docker-compose.yml` (frontend build context is the sibling `../telegram-dashboard`). Known gotcha: `/opt/telemon/backend`'s git remote is currently misconfigured (points at the frontend repo) — verify before assuming `git pull` will work there; if it fails, confirm with the user before applying a direct file-copy workaround.
5. Rebuild and restart only the affected container(s) — `docker compose build <service> && docker compose up -d --no-deps <service>` — not the whole stack.
6. Verify: container health, startup logs, and an HTTP check against the real domain (Host header matters, e.g. `curl -H "Host: api.telemon.online" http://localhost/`).
7. Confirm and report the deployed commit SHA.

## Common mistakes seen in this repo (2026-07-21/22 incident review)

These caused real production outages or hours of wasted rebuild cycles. Check for these specifically before committing:

1. **JSX in a `.ts` file.** Any file with `<div>`, `<Component />`, etc. must be `.tsx`, not `.ts`. This alone broke 15+ files in one batch. If a `.ts` file needs a generic arrow function, `.tsx` requires a trailing comma to disambiguate from JSX: `<T,>(x: T) => ...`, not `<T>(x: T) => ...`.
2. **A file saved as UTF-16 instead of UTF-8** silently breaks the build with no useful error at first glance (looks like garbage/mojibake). If a file you didn't expect to change shows spaced-out characters or mojibake, check encoding (`file <path>`) before assuming content corruption — it's usually an editor/tool encoding bug, and the fix is `iconv -f UTF-16LE -t UTF-8`, not a content rewrite.
3. **`npx tsc --noEmit` passing does not mean `next build` will succeed.** ESLint-as-part-of-build and webpack's own parse can still fail. CI now runs `next build` for real (see `frontend-ci`) — don't rely on tsc alone before telling the user something is fixed.
4. **camelCase vs snake_case mismatches** between frontend types and actual backend JSON responses (e.g. `amountCents` vs `amount_cents`). The backend is the source of truth for wire format; when adding a frontend type for an API response, match the backend schema's field names exactly, or generate the type from the OpenAPI spec (`npm run typegen`) instead of hand-writing it.
5. **A root-level `app/` directory in the frontend repo shadows `src/app/` entirely** — Next.js prefers root `app/` over `src/app/` when both exist, silently producing an almost-empty build (just a 404 page) with no build error. If a `next build` produces suspiciously few routes, check for a stray root `app/` directory first.
6. **Component prop mismatches**: `Badge` does not accept `onClick` (wrap it in a `<button>` instead); `Panel` does not accept `onTouchStart`/`onTouchMove`/`onTouchEnd` (wrap it in a `<div>` instead). Check the actual component's prop interface before passing an event handler — don't assume every UI primitive forwards arbitrary DOM props.
7. **Alembic revision IDs must be generated, never hand-typed.** Two different migrations picking the same hand-typed hex string as their `revision` causes a silent collision that only surfaces at `alembic upgrade`/`alembic heads` time. Always use `alembic revision --autogenerate -m "..."` and let it generate the ID.
8. **Multiple alembic heads must be merged before pushing**, not left diverged — run `alembic heads` and confirm exactly one line before committing a new migration. The pre-commit hook now checks this automatically.
9. **CI env vars must match every required Pydantic Settings field**, not just the obviously-relevant one — `Settings` failing to construct (e.g. missing `encryption_key`) crashes `from app.main import app` before your actual code even runs, producing a confusing error that looks unrelated to what you changed.
10. **Don't build a second implementation of something that already exists** (e.g. a duplicate inline-buttons UI when `InlineButtonBuilder` already exists and is already wired up) — check `codebase-memory-mcp`/`grep` for an existing component before adding a new one that does the same thing with different, disconnected state.
11. **Before creating a new utility function or constant** (formatMoney, formatDate, PLAN_LABEL, PLAN_COLOR, etc.), grep `src/lib/` and `src/lib/constants/` first. These are centralized in `src/lib/format.ts` and `src/lib/constants/plans.ts` — duplicates cause merge conflicts and style inconsistency.

## Do-not-do checklist

- Don't hand-pick alembic revision IDs — always `--autogenerate`.
- Don't commit a `.ts` file containing JSX — rename to `.tsx` first.
- Don't pass `onClick`/`onTouch*` to `Badge` or `Panel` — wrap them instead.
- Don't assume `npx tsc --noEmit` passing means the build is safe to deploy — CI also runs `next build`.
- Don't bypass a pre-commit hook with `--no-verify` without the user's explicit request.
- Don't push directly to `master` bundling unrelated/unapproved work — confirm scope first.
- Don't hand-write a frontend type for a backend response — prefer `npm run typegen` from the OpenAPI spec.
- Don't create a root-level `app/` directory in the frontend repo, ever — it will shadow `src/app/`.
- Don't use real user accounts for testing — run `bash scripts/team/use-test-tenant.sh` first.
- Don't ignore PAUSE signal in `.kilo/PAUSE` — run `bash scripts/team/resume-all.sh` when cleared.

## 팀 협업 도구

다음 스크립트가 `scripts/team/`에 있습니다:
- `update-status.sh` — TEAM_STATUS.md 1줄 요약 갱신 (최신 커밋/CI/이슈)
- `blame-summary.sh <file>` — 파일 마지막 수정자 1줄 조회
- `handoff.sh <session-id>` — 인수인계 템플릿 생성
- `sync-issues.sh` — TEAM_STATUS.md 할일 → GitHub Issue 자동 발급
- `ci-summary.sh [run-id]` — CI 실패 원인 요약
- `weekly-report.sh` — 주간 변경 리포트
- `deploy-checklist.sh` — 배포 전 자동 검증
- `agent-timeline.sh [date]` — 오늘 작업 타임라인
- `pause-all.sh "사유"` — 긴급 전체 중단
- `resume-all.sh` — 중단 해제
- `test-tenant.sh` — 테스트 계정 규칙 안내
- `conflict-detect.js` — 동시 작업 충돌 감지
