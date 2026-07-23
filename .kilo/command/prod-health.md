---
description: verify production health — VPS status, Sentry, health endpoint
agent: telemon-debugger
---
1. SSH: `ssh root@130.94.32.152 "docker compose -f /opt/telemon/backend/docker-compose.yml ps"`
2. Health check: `curl -H "Host: api.telemon.online" http://130.94.32.152/health`
3. Frontend check: `curl -H "Host: app.telemon.online" http://130.94.32.152/ -o /dev/null -w '%{http_code}'`
4. Backend logs last 50: `ssh root@130.94.32.152 "docker compose -f /opt/telemon/backend/docker-compose.yml logs backend --tail=50"`
5. Report: all green or what's red
