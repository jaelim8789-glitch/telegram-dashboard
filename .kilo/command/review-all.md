---
description: review all uncommitted changes before committing
agent: plan
---
1. Run `git diff` to see all uncommitted changes
2. For each changed file, review the diff:
   - Check for JSX in `.ts` files (must be `.tsx`)
   - Check for UTF-16/CP949 encoding issues (look for mojibake)
   - Check for `any` type casts that should be specific
   - Check for missing `try/catch` on localStorage calls
   - Check for console.log/debugger statements
3. Run `npx tsc --noEmit` as a final check
4. Summarize findings with severity levels
