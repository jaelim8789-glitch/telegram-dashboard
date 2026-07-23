---
description: fix merge conflicts quickly by accepting our or their version
agent: code
subtask: true
---
1. Check `git status` for files marked UU (unmerged)
2. Ask the user: accept "ours" or "theirs" for each conflicted file
3. Run `git checkout --ours <file>` or `git checkout --theirs <file>` for each
4. Run `git add -A` and `git commit` with merge message
5. Run `npm run build` to verify no breakage
6. If build fails, fix the imported components and retry
