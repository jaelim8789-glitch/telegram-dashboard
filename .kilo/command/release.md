---
description: complete release cycle — merge branches, build, deploy to VPS
agent: telemon-deployer
---
1. Check if any feat branches need merging: `git branch -r --no-merged origin/master`
2. For each, merge into release worktree at `c:\Dev\TeleMon-release`
3. Run `npm run build` in release worktree
4. Push: `git push origin worktree/release:master --no-verify`
5. VPS: `ssh root@130.94.32.152 "cd /opt/telemon/backend && docker compose pull frontend && docker compose up -d --no-deps frontend && docker compose restart backend"`
6. Verify deploy with `/prod-health`
7. Report deployed commit SHA
