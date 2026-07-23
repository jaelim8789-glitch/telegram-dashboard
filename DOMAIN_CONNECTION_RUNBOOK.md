# Domain Connection Runbook — TeleMon Production Deployment

Connecting `<DOMAIN>` to the TeleMon stack (Docker Compose + nginx reverse proxy + Cloudflare).

## Architecture Overview

```
Internet → Cloudflare (TLS termination, proxy) → Server:80 → nginx container
                                                              ├── /api/* → backend:8000 (FastAPI)
                                                              └── /*     → frontend:3000 (Next.js standalone)
```

- **Port 3000 (frontend)** — internal only, no host port mapping
- **Port 8000 (backend)** — internal only, no host port mapping
- **Port 80 (nginx)** — single public entrypoint, bound on host
- **Port 443** — not used on origin; Cloudflare handles TLS at the edge
- **PostgreSQL** — internal container, no host port

Three subdomain architecture:
| Subdomain | Purpose |
|---|---|
| `<DOMAIN>` | Public marketing site |
| `app.<DOMAIN>` | Authenticated dashboard |
| `api.<DOMAIN>` | Direct API access (optional) |

---

## 1. Prerequisites

- [ ] Domain purchased and registered (e.g., via Namecheap, GoDaddy, Cloudflare Registrar)
- [ ] DNS provider access (the registrar's panel or Cloudflare Dashboard)
- [ ] SSH access to the target server (`ssh user@<SERVER_IP>`)
- [ ] Cloudflare account with the domain added (`https://dash.cloudflare.com` → Add Site)
- [ ] Docker & Docker Compose installed on the server
- [ ] Current `.env` file with production-ready secrets already on the server

---

## 2. DNS Configuration

Add these DNS records in **Cloudflare Dashboard** → `<DOMAIN>` → **DNS → Records**.

| Type | Name | Value | Proxy status | TTL |
|---|---|---|---|---|
| A | `@` | `<SERVER_IP>` | Proxied (orange cloud) | Auto |
| A | `app` | `<SERVER_IP>` | Proxied (orange cloud) | Auto |
| A | `api` | `<SERVER_IP>` | Proxied (orange cloud) | Auto |

Records to create in Cloudflare DNS terminology:

```
A  <DOMAIN>            → <SERVER_IP>  (Proxied)
A  app.<DOMAIN>        → <SERVER_IP>  (Proxied)
A  api.<DOMAIN>        → <SERVER_IP>  (Proxied)
```

**Why Proxied (orange cloud):** Cloudflare Full (Strict) mode requires traffic to pass through Cloudflare's proxy. Grey-cloud (DNS-only) bypasses Cloudflare and disables TLS termination.

**Propagation:** 1–5 minutes with Cloudflare proxying; up to 48 hours for uncached TTL. Verify with:
```bash
dig +short <DOMAIN>
dig +short app.<DOMAIN>
```

---

## 3. Server Configuration Changes

All changes below must be applied on the production server (not local).

### 3.1 nginx `server_name`

Edit `nginx/nginx.conf` and update all `server_name` directives. Replace the hardcoded `telemon.online` with `<DOMAIN>`:

| Line (approx) | Current | Replace with |
|---|---|---|
| `server_name telemon.online;` | `telemon.online` | `<DOMAIN>` |
| `server_name app.telemon.online;` | `app.telemon.online` | `app.<DOMAIN>` |
| `server_name api.telemon.online;` | `api.telemon.online` | `api.<DOMAIN>` |

### 3.2 Backend `TrustedHostMiddleware`

Edit `app/main.py` — update the `allowed_hosts` list (lines 121–127):

```python
allowed_hosts=[
    "<DOMAIN>",
    "app.<DOMAIN>",
    "api.<DOMAIN>",
    "localhost",
    "127.0.0.1",
],
```

This middleware is only activated when `ENVIRONMENT=production`.

### 3.3 Environment Variables (`.env`)

Update these values in the server's `.env` file:

```ini
ENVIRONMENT=production
DEBUG=false

CORS_ORIGINS=https://<DOMAIN>,https://app.<DOMAIN>
FRONTEND_URL=https://app.<DOMAIN>
APP_URL=https://app.<DOMAIN>
```

Also ensure SMS provider is switched from `console` to a real provider:
```ini
SMS_PROVIDER=twilio
# or
SMS_PROVIDER=coolsms
```

---

## 4. TLS/HTTPS Strategy — Cloudflare Full (Strict)

No certbot or TLS termination on the origin server.

1. In **Cloudflare Dashboard** → **SSL/TLS** → **Overview**, select **Full (Strict)**
2. In **SSL/TLS** → **Origin Server**, create an **Origin Certificate** (optional but recommended for defense-in-depth; if used, configure nginx to serve it)
3. Ensure **SSL/TLS** → **Edge Certificates** → **Always Use HTTPS** is **ON**
4. Keep nginx listening on port 80 (HTTP only) — Cloudflare connects to port 80 with HTTP proxied traffic

**Security note:** Cloudflare Full (Strict) requires Cloudflare to be able to validate the origin's certificate. Since we are not using a certificate on the origin (nginx listens on plain HTTP), the setup relies on Cloudflare's **Full** mode (not Strict). Verify in Cloudflare SSL/TLS settings:
- If the origin has **no** TLS certificate → use **Full** (not Full Strict)
- If an origin certificate is installed → use **Full (Strict)**

For maximum security with minimal overhead, use **Full** mode and rely on:
- Cloudflare's edge TLS for all client connections
- IP allowlisting to restrict direct server access
- Cloudflare WAF/rate-limiting rules

---

## 5. Environment Variable Changes (detailed)

Full diff for the server's `.env`:

```diff
- ENVIRONMENT=development
+ ENVIRONMENT=production

- DEBUG=true
+ DEBUG=false

- CORS_ORIGINS=http://localhost:3000,http://localhost
+ CORS_ORIGINS=https://<DOMAIN>,https://app.<DOMAIN>

- FRONTEND_URL=http://localhost:3000
+ FRONTEND_URL=https://app.<DOMAIN>

+ APP_URL=https://app.<DOMAIN>

- SMS_PROVIDER=console
+ SMS_PROVIDER=twilio   # or coolsms
```

The backend profile validation (`_reject_insecure_production_defaults` in `config.py`) will block startup if `ADMIN_USERNAME`, `ADMIN_PASSWORD`, or `ADMIN_JWT_SECRET` still have their default values. Override them:

```ini
ADMIN_USERNAME=<secure-admin-username>
ADMIN_PASSWORD=<strong-random-password>
ADMIN_JWT_SECRET=<generated-via: python -c "import secrets; print(secrets.token_urlsafe(48))">
```

---

## 6. Docker Rebuild & Restart

Run these commands on the server from the project root:

```bash
# 1. Pull latest code (if deploying from git)
git pull

# 2. Rebuild all images (uses Docker layer cache)
docker compose build

# 3. Restart all services
docker compose up -d

# 4. Verify all containers are running
docker compose ps
```

Expected output:
```
NAME                   IMAGE                        STATUS         PORTS
telegram-dashboard-db  postgres:16-alpine            Up (healthy)   5432/tcp
telegram-dashboard-ba  telegram-dashboard-backend    Up             8000/tcp
telegram-dashboard-fr  telegram-dashboard-frontend   Up             3000/tcp
telegram-dashboard-ng  telegram-dashboard-nginx      Up             0.0.0.0:80->80/tcp
```

---

## 7. Verification Commands

Run these from the server itself (or any machine after DNS propagates):

### 7.1 Backend health check
```bash
curl -s http://localhost:80/health
# Expected: {"status":"ok","environment":"production"}
```

### 7.2 Frontend reachable
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:80/
# Expected: 200
```

### 7.3 Public DNS-frontend check
```bash
curl -s -o /dev/null -w "%{http_code}" https://<DOMAIN>
# Expected: 200

curl -s -o /dev/null -w "%{http_code}" https://app.<DOMAIN>
# Expected: 200
```

### 7.4 API reachable through nginx
```bash
curl -s -o /dev/null -w "%{http_code}" https://<DOMAIN>/api/health
# Expected: 200
```

### 7.5 Docker logs (no errors)
```bash
docker compose logs --tail=50 nginx
docker compose logs --tail=50 backend  | grep -i error
docker compose logs --tail=50 frontend | grep -i error
```

### 7.6 Browser checks
- Open `https://<DOMAIN>` — public landing page loads, padlock icon present
- Open `https://app.<DOMAIN>` — dashboard login page loads, padlock present
- Open DevTools → Console: no mixed-content warnings
- Open DevTools → Network: all requests go to `https://...`, no CORS errors

---

## 8. Rollback Procedure

### 8.1 DNS rollback
1. In Cloudflare Dashboard, set DNS records back to whatever they were before (or delete the A records to take the site offline cleanly)
2. Propagation is instant with Cloudflare proxying

### 8.2 Environment rollback
```bash
# Restore previous .env from backup
cp .env.bak .env
docker compose build
docker compose up -d
```

### 8.3 Image rollback (previous Docker image)
```bash
# Revert to previous images if the new build is broken
docker compose up -d --no-build  # uses last built images
```

### 8.4 Full nginx revert
```bash
git checkout HEAD~1 -- nginx/nginx.conf
docker compose build nginx
docker compose up -d nginx
```

### 8.5 Complete system revert
```bash
# If everything fails, shut down and restore from backup
docker compose down
git stash  # or reset to previous commit
cp .env.bak .env
docker compose build
docker compose up -d
```

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `curl` returns `Connection refused` on port 80 | nginx container not running or host firewall blocking port 80 | `docker compose ps nginx`; check `ufw status` / `iptables -L`; ensure port 80 is open in the cloud firewall (AWS SG, Hetzner firewall, etc.) |
| Cloudflare shows `522 Origin Connection Timeout` | Server firewall or nginx misconfiguration | Verify port 80 is open to Cloudflare IPs; check `docker compose logs nginx` |
| `502 Bad Gateway` from nginx | Backend/frontend container not running or unhealthy | `docker compose ps`; `docker compose logs backend` |
| `TrustedHostMiddleware` returns 400 | `allowed_hosts` in `main.py` doesn't include the requested domain | Update `app/main.py` and rebuild |
| CORS error in browser | `CORS_ORIGINS` in `.env` doesn't match the browser's origin | Update `.env` and rebuild/restart |
| Frontend loads but API calls fail with 404 | nginx proxy_pass path mismatch | Check `location /api/` block in `nginx.conf` — note the trailing slash on `proxy_pass http://backend;` (no trailing slash = path preserved) |
| Mixed content warning (HTTP loaded over HTTPS) | Frontend has hardcoded `http://` URLs | Check `NEXT_PUBLIC_API_BASE_URL` build arg; ensure it's `https://` or empty (relative) |
| Docker build fails on server | Out of disk space, or ARM vs x86 mismatch | `docker system df`; `docker builder prune`; verify server architecture |
| `docker compose up -d` exits immediately | Port 80 already in use on host | `netstat -tulpn \| grep :80`; stop conflicting process (e.g., another nginx, Apache, or `nginx -s stop`) |
| Cloudflare shows `521 Web Server Is Down` | Origin server is unreachable (IP changed, server off) | Ping `<SERVER_IP>`; `ssh` to server; check `docker compose ps` |
| `DEBUG=true` exposed `/docs` in production | `.env` not updated | Set `DEBUG=false` and rebuild |

---

## Quick Reference — Files to Touch

| File | Path | Change |
|---|---|---|
| nginx config | `nginx/nginx.conf` | Replace `telemon.online` → `<DOMAIN>` in all `server_name` directives |
| Backend main | `app/main.py` | Replace `telemon.online` → `<DOMAIN>` in `allowed_hosts` list |
| Environment | `.env` | Set `ENVIRONMENT=production`, `DEBUG=false`, update `CORS_ORIGINS`, `FRONTEND_URL`, `APP_URL` |
| Backend config | `app/config.py` | No changes needed (reads all values from `.env`) |
| Dockerfile | `Dockerfile` | No changes needed (build args are optional) |
| Docker Compose | `docker-compose.yml` | No changes needed |
