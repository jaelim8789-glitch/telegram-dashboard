---
description: full launch checklist — verify everything before go-live
agent: code
---
Pre-launch verification checklist:
1. [ ] npm run build passes with no errors
2. [ ] npm run typecheck passes
3. [ ] pnpm lint passes  
4. [ ] /prod-health: VPS containers all healthy
5. [ ] curl https://app.telemon.online returns 200
6. [ ] curl https://api.telemon.online/health returns 200
7. [ ] Telegram bot /start returns menu
8. [ ] Mini app opens: https://t.me/telemon_verify_bot?startapp
9. [ ] No Sentry errors in last 24h
10. [ ] No uncommitted changes in master: `git status --short`
Run each check, report pass/fail with details.
