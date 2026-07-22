---
description: clean up stale branches and worktrees (merged + 7 days old)
agent: git-ops
---
1. Delete merged local branches: `git branch --merged master | grep -v 'master\|\*' | xargs git branch -d`
2. Delete merged remote branches: list, confirm, push --delete
3. Prune worktrees: `git worktree prune`
4. List remaining worktrees: `git worktree list`
5. Report: branches deleted, worktrees pruned
