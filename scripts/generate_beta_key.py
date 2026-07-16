"""
Generate an unlimited API key for a beta tester.
Usage: python scripts/generate_beta_key.py

Key features:
- Lifetime plan (unlimited accounts/daily limit)
- max_accounts=9999, daily_limit=999999
- Stored in data/admin.db with SHA-256 hash
- Printed once on stdout — save it immediately
"""
import sqlite3, secrets, hashlib, uuid, json
from datetime import datetime, timezone

DB_PATH = "data/admin.db"

def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

def create_unlimited_key():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Find first admin user (or create one)
    cursor = conn.execute("SELECT id, username FROM users WHERE role IN ('admin','super_admin') LIMIT 1")
    user = cursor.fetchone()

    if not user:
        # Check any user
        cursor = conn.execute("SELECT id, username FROM users LIMIT 1")
        user = cursor.fetchone()

    if not user:
        print("No users found. Create an admin user via the admin UI first.")
        conn.close()
        return

    user_id = user["id"]
    username = user["username"]

    # Generate key
    key_id = str(uuid.uuid4())
    raw_key = f"tm_{secrets.token_urlsafe(32)}"
    key_hash = hash_api_key(raw_key)
    key_prefix = raw_key[:12]
    now = datetime.now(timezone.utc).isoformat()
    feature_flags = json.dumps({
        "can_export": True,
        "can_webhook": True,
        "bulk_operations": True,
        "sso": True,
        "white_label": True,
    })

    conn.execute(
        """INSERT INTO api_keys
           (id, user_id, key_hash, key_prefix, name, permissions,
            plan, feature_flags, max_accounts, daily_limit,
            is_active, expires_at, created_at,
            usage_count, usage_reset_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, 0, ?)""",
        (key_id, user_id, key_hash, key_prefix, "Unlimited Beta Tester", "write",
         "lifetime", feature_flags, 9999, 999999,
         now, now),
    )
    conn.commit()
    conn.close()

    print()
    print("=" * 60)
    print("  UNLIMITED BETA TESTER API KEY")
    print("=" * 60)
    print(f"  Key:         {raw_key}")
    print(f"  Plan:        Lifetime (무제한)")
    print(f"  Max 계정:    9,999")
    print(f"  일일 제한:   999,999")
    print(f"  소유자:      {username}")
    print(f"  생성일:      {now}")
    print("=" * 60)
    print()
    print("  ⚠  이 키는 지금만 표시됩니다. 저장하세요!")
    print()

if __name__ == "__main__":
    create_unlimited_key()