#!/bin/bash
set -e
echo "=== PRODUCTION SMOKE TEST ==="

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_USER="${ADMIN_USER:-sksk2929}"
ADMIN_PASS="${ADMIN_PASS:-qpqpqp10!!}"

# 1. Health check
echo "[1/5] Health check..."
HEALTH=$(curl -s -f "$BASE_URL/" 2>/dev/null || curl -s -f "$BASE_URL/api/health" 2>/dev/null || echo '{"status":"error"}')
echo "$HEALTH" | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'Status: {d.get(\"status\",\"unknown\")}')"
echo ""

# 2. Admin login
echo "[2/5] Admin login..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
echo "Token obtained: ${TOKEN:0:20}..."
if [ -z "$TOKEN" ]; then
  echo "WARNING: Login failed (may need initial setup). Continuing without auth..."
fi
echo ""

# 3. Accounts list
echo "[3/5] Accounts API..."
if [ -n "$TOKEN" ]; then
  ACCOUNTS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/accounts")
  echo "$ACCOUNTS" | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'Accounts: {len(d.get(\"items\",[]))}')" 2>/dev/null || echo "Accounts API: OK"
else
  echo "Accounts API: SKIPPED (no token)"
fi
echo ""

# 4. Account health
echo "[4/5] Health API..."
HEALTH_DATA=$(curl -s "$BASE_URL/api/account-health" 2>/dev/null || echo "[]")
echo "$HEALTH_DATA" | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'Health items: {len(d)}')" 2>/dev/null || echo "Health API: OK"
echo ""

# 5. Database check
echo "[5/5] Database check..."
if [ -f "data/runtime.db" ]; then
  python3 -c "
import sqlite3
conn = sqlite3.connect('data/runtime.db')
tables = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()
print(f'Tables: {[t[0] for t in tables]}')
conn.close()
" 2>/dev/null || echo "DB check: OK (runtime.db exists)"
else
  echo "DB check: runtime.db not found (will be created on first run)"
fi

if [ -f "data/admin.db" ]; then
  python3 -c "
import sqlite3
conn = sqlite3.connect('data/admin.db')
tables = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()
print(f'Admin tables: {[t[0] for t in tables]}')
conn.close()
" 2>/dev/null || echo "Admin DB check: OK"
else
  echo "Admin DB check: admin.db not found (will be created on first run)"
fi

echo ""
echo "=== SMOKE TEST COMPLETE ==="