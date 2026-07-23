---
description: scan entire codebase for 10 TeleMon-specific bugs, report severity
agent: telemon-reviewer
---
1. Check for JSX in .ts files (grep for `<Component` in .ts not .tsx)
2. Check for localStorage without try/catch in miniapp
3. Check for @tma.js static imports outside Telegram context
4. Check for Badge/Panel with onClick/onTouch props
5. Check for imageFile! non-null assertions
6. Check for empty catch blocks
7. Check for as TabId without validation
8. Report each finding: file:line, severity, fix suggestion
