---
description: create a new git worktree, install deps, start dev, ready for coding
agent: telemon-dev
---
1. Parse $1 as feature name (default: "feature")
2. Run `git worktree add .kilo/worktrees/feat-$1 origin/master -b feat/$1`
3. Run `cd .kilo/worktrees/feat-$1 && pnpm install`
4. Run `cd .kilo/worktrees/feat-$1 && npm run dev -- -p $((3000 + RANDOM % 1000))`
5. Confirm: worktree ready, dev server running
