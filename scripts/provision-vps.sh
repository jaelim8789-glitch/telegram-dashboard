# TeleMon VPS Provisioning Script
#
# Usage:
#   ssh root@<VPS_IP> 'bash -s' < scripts/provision-vps.sh
#
# This script idempotently sets up a fresh Ubuntu 22.04/24.04 VPS for TeleMon.
# Run once per VPS. After completion, deploy via GitHub Actions.
#
# Prerequisites:
#   - Ubuntu 22.04+ VM with root SSH access
#   - DNS records pointing to VPS IP:
#     telemon.online, app.telemon.online, api.telemon.online, staging.telemon.online
#   - Cloudflare proxying the domains (Full Strict)
#   - GitHub secrets configured:
#     VPS_HOST, VPS_USER, VPS_SSH_KEY, ALERT_WEBHOOK_URL, etc.

set -euo pipefail

log() { echo "[$(date '+%H:%M:%S')] $*"; }
err() { echo "[ERROR] $*" >&2; }

# ─── 1. System packages ──────────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git ufw fail2ban \
    apt-transport-https ca-certificates gnupg lsb-release \
    htop net-tools dnsutils \
    unattended-upgrades

# ─── 2. Docker (official repo) ──────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
else
    log "Docker already installed"
fi

# ─── 3. Docker Compose plugin ──────────────────────────────────────────
if ! docker compose version &>/dev/null; then
    log "Installing Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin
fi

# ─── 4. Clone repositories ──────────────────────────────────────────────
mkdir -p /opt/telemon

if [ ! -d /opt/telemon/telegram-dashboard ]; then
    log "Cloning frontend repo..."
    git clone https://github.com/<ORG>/telegram-dashboard.git /opt/telemon/telegram-dashboard
fi

if [ ! -d /opt/telemon/backend ]; then
    log "Cloning backend repo..."
    git clone https://github.com/<ORG>/telegram-dashboard-backend.git /opt/telemon/backend
fi

# ─── 5. Environment file ────────────────────────────────────────────────
if [ ! -f /opt/telemon/backend/.env ]; then
    log "Creating .env file (placeholder — edit with real values)..."
    cat > /opt/telemon/backend/.env << 'EOF'
# === Database ===
DATABASE_URL=postgresql+asyncpg://telegram_dashboard:CHANGE_ME@db:5432/telegram_dashboard

# === Security ===
ENCRYPTION_KEY=CHANGE_ME
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
ADMIN_JWT_SECRET=CHANGE_ME

# === Telegram API (my.telegram.org) ===
TELEGRAM_API_ID=
TELEGRAM_API_HASH=

# === Telegram Bot (@BotFather) ===
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=telemon_verify_bot
TELEGRAM_OFFICIAL_CHANNEL_ID=@TeleMon_2

# === Sentry (optional) ===
SENTRY_DSN=

# === Environment ===
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://telemon.online,https://app.telemon.online
FRONTEND_URL=https://app.telemon.online
API_BASE_URL=https://api.telemon.online
EOF
    chmod 600 /opt/telemon/backend/.env
    log "⚠️  EDIT /opt/telemon/backend/.env with real secrets before starting"
fi

# ─── 6. Create backup directory ─────────────────────────────────────────
mkdir -p /backups/telemon
chmod 750 /backups

# ─── 7. Firewall (ufw) ──────────────────────────────────────────────────
log "Configuring firewall..."
ufw --force disable 2>/dev/null || true
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp  # staging nginx
ufw --force enable

# ─── 8. Fail2ban (SSH protection) ──────────────────────────────────────
log "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
EOF
systemctl enable --now fail2ban

# ─── 9. Automatic security updates ──────────────────────────────────────
log "Configuring unattended upgrades..."
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

# ─── 10. Docker system prune (weekly) ───────────────────────────────────
log "Setting up weekly Docker cleanup..."
cat > /etc/cron.weekly/docker-cleanup << 'CRON'
#!/bin/sh
docker system prune -f --volumes
CRON
chmod +x /etc/cron.weekly/docker-cleanup

# ─── 11. Swap (1GB for low-memory VPS) ─────────────────────────────────
if ! swapon --show | grep -q .; then
    log "Creating 1GB swap file..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ─── 12. Docker compose pull & start ────────────────────────────────────
log "Pulling Docker images..."
cd /opt/telemon/backend
docker compose pull 2>/dev/null || true
# First start will create volumes — manual .env setup required first
# docker compose up -d

log ""
log "═══════════════════════════════════════════"
log "  ✅ VPS provisioning complete"
log ""
log "  Next steps:"
log "  1. Edit /opt/telemon/backend/.env with real secrets"
log "  2. cd /opt/telemon/backend && docker compose up -d"
log "  3. Verify: curl http://localhost/health"
log "  4. Configure GitHub secrets for CI/CD"
log ""
log "  Backup: /backups/telemon/ (daily pg_dump)"
log "═══════════════════════════════════════════"
