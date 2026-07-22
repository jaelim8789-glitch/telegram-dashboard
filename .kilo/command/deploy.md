---
description: merge current branch to release worktree and deploy to VPS
agent: code
---
1. Check if TeleMon-release worktree exists at `c:\Dev\TeleMon-release`
2. If not, run `git worktree add c:\Dev\TeleMon-release origin/master -b worktree/release`
3. In the release worktree, run `git merge <current-branch> --no-edit`
4. Resolve any conflicts with `git checkout --theirs . && git add -A && git commit`
5. Run `npm run build` in the release worktree — must pass
6. Push: `git push origin worktree/release:master --no-verify`
7. VPS: `ssh root@130.94.32.152 "cd /opt/telemon/backend && docker compose build frontend && docker compose up -d --no-deps frontend"`
8. Report deploy status
