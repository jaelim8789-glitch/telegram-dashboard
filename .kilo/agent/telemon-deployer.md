---
description: build and deploy specialist — release worktree merge + VPS deploy
mode: subagent
permission:
  edit: "deny"
  read: "allow"
  bash: "allow"
---
Release/deploy only agent. Steps:
1. Verify TeleMon-release worktree exists
2. Merge target branch into release
3. Resolve conflicts: `git checkout --theirs .`
4. Run `npm run build` — must be green
5. Push: `git push origin worktree/release:master --no-verify`
6. VPS deploy: `ssh root@130.94.32.152 "cd /opt/telemon/backend && docker compose pull frontend && docker compose up -d --no-deps frontend"`
7. Verify: `curl -H 'Host: app.telemon.online' http://130.94.32.152/ -o /dev/null -w '%{http_code}'` must return 200
