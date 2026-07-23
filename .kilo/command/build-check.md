---
description: 빌드 + 타입체크 + 린트를 한 번에 실행합니다
agent: code
subtask: true
---
1. Run `npm run build` to verify the production build passes
2. If build fails, read the error output and fix the root cause
3. Run `npx tsc --noEmit` to verify type safety
4. Run `pnpm lint` to verify code quality
5. Report pass/fail for all three checks
