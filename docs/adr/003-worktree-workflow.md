# ADR 003: Git Worktree Development Workflow

**Date:** 2026-07-23
**Status:** Accepted

## Context
Multiple developers work on the same monorepo simultaneously. Feature branches can diverge significantly.

## Decision
Use `git worktree` to check out each feature branch into its own directory with its own `node_modules` and `.next` cache.

## Consequences
- **Positive:** No need to stash/reinstall when switching contexts; each branch has isolated build cache
- **Negative:** Disk usage increases per worktree; requires discipline to clean up stale worktrees
- **Mitigation:** `scripts/worktree-dashboard.mjs` manages worktree lifecycle

## Alternatives Considered
- **Single checkout + stash:** Lost work when stash conflicts; slow context switching
- **Docker dev containers:** Heavy for frontend development
