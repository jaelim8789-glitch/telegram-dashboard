---
description: add a new tab/feature following TeleMon conventions
agent: telemon-dev
---
Guide for adding a new workspace tab:
1. Check `src/types/index.ts` — add TabId if new
2. Create component in `src/components/workspace/tabs/NewTab.tsx`
3. Register in `src/components/layout/Workspace.tsx` TAB_CONTENT map
4. Add to `src/types/index.ts` TABS array
5. If SendTab-related: add to `src/components/workspace/tabs/send/` directory
6. Run `npm run build` to verify imports
7. Report files created and verify tab appears
