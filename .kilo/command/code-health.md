---
description: deep-dive codebase analysis — find duplication, hotspots, refactor targets
agent: code
---
1. Run `npx knip` for unused exports
2. Run `npx jscpd src/` for code duplication
3. Find largest files: `git ls-files '*.tsx' | xargs wc -l | sort -rn | head -10` (max limit for shorter output)
4. Find most-changed files: `git log --since='30 days ago' --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20`
5. Report: unused code, duplication %, hotspots, recommended refactor targets
