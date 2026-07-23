# Contributing to TeleMon

## Overview
TeleMon is a Telegram account management dashboard with a Next.js frontend and FastAPI backend. This guide covers the workflow all contributors should follow.

## Repo Structure
- c:\Dev\TeleMon — Next.js frontend (Git root)
- 	elegram-dashboard-backend/ — FastAPI backend (**separate git repo**)
- Worktrees at c:\Dev\TeleMon-* for development isolation

## Branch Strategy
| Branch | Purpose |
|--------|---------|
| master | Production — merge-only via PR |
| worktree/<agent> | Individual developer worktrees |
| eat/* | Feature branches (created from master) |
| ix/* | Bug fix branches |
| elease-* | Release staging (managed by CI) |

## Commit Rules
1. **Format**: 	ype(scope): description — e.g. eat(send): add bulk send UI
2. **Types**: eat, ix, efactor, perf, docs, chore, ci, 	est
3. **One logical change per commit** — no batch commits
4. package.json changes **must** include pnpm-lock.yaml in the same commit
5. Run pnpm build before committing
6. Never force-push to shared branches

## PR Workflow
1. Create a worktree: git worktree add .kilo/worktrees/feat-name origin/master -b feat/name
2. Develop and commit in the worktree
3. Push the branch: git push origin feat/name
4. Open a PR against master on GitHub
5. Ensure all CI checks pass (build, typecheck, lint, tests)
6. Request review from at least one team member
7. Merge via **Squash & Merge** (keeps history clean)

## Code Standards
- Frontend: React 18 + Next.js App Router + Tailwind v4 + Zustand
- Backend: FastAPI + SQLAlchemy async + Pydantic v2
- Package manager: **pnpm only** (never npm)
- Use @/ path alias for frontend imports
- All new UI components go in src/components/ui/
- All API routes in src/lib/api.ts
- All constants in src/lib/constants/
- **Never put JSX in .ts files** — use .tsx

## Testing
- Frontend: Jest for unit tests, Playwright for E2E
- Backend: pytest
- Write tests alongside features, not after

## Setup
`ash
pnpm install
pnpm dev        # frontend only
pnpm dev:with-backend  # frontend + backend
`

## Need Help?
Open a GitHub Discussion or ask in the team channel.