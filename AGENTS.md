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
