---
description: after a merge conflict, resolve it and verify build
agent: code
---
1. Check `git status` for unmerged files
2. For each conflict, decide: ours (current) or theirs (incoming)
3. Run `git checkout --ours <file>` or `git checkout --theirs <file>`
4. For add/add conflicts where both sides have valid code: merge manually
5. After all resolved: `git add -A && git commit -m "merge: resolve conflicts"`
6. Run `npm run build` to verify
7. Report resolved files and build status
