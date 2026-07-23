---
description: removes unused imports, dead exports, and stale files from the codebase
agent: code
---
1. Run `npx knip` to find unused files, exports, and dependencies
2. For each finding, verify it's truly unused with `grep` across the codebase
3. Remove dead files with `git rm`
4. Remove unused imports and exports
5. Run `npm run build` to verify nothing broke
6. Commit and report summary
