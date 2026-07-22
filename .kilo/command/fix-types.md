---
description: fix all typecheck errors and commit the fixes
agent: code
---
1. Run `npx tsc --noEmit` and capture all errors
2. Fix every error in priority order
3. Run `npx tsc --noEmit` again to confirm clean
4. `git add` and `git commit` with a descriptive message
5. Report files changed and error count fixed
