---
description: automatically fix all common TeleMon boilerplate mistakes
agent: code
subtask: true
---
1. Run `bash scripts/check_encoding.bat` — fix any UTF-16/CP949 files with iconv
2. Run `bash scripts/jsx-in-ts-check.mjs` — rename any .ts files containing JSX to .tsx
3. Check for `catch {}` patterns missing error logging in mobile components
4. Verify `package.json` is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('package.json'))"`
5. Verify `pnpm-lock.yaml` is synced: `pnpm install --frozen-lockfile`
6. Report all fixes made
