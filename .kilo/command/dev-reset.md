---
description: reset dev environment - delete node_modules, .next, reinstall
agent: code
subtask: true
---
1. Run `Remove-Item -Recurse -Force node_modules, .next -ErrorAction SilentlyContinue`
2. Run `pnpm install`
3. Run `npm run build` to verify everything works
4. Report status
