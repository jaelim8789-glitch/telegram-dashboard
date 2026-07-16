import type { APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";

let counter = 0;

/** A phone number unique enough not to collide with a previous/concurrent test run. */
export function uniquePhone(): string {
  counter += 1;
  const suffix = `${Date.now()}`.slice(-7) + counter;
  return `+8210${suffix}`.slice(0, 15);
}

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "123123";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "123456";
const ADMIN_DB_PATH = process.env.ADMIN_DB_PATH ?? "data/admin.db";
const SESSION_DB_PATH = "data/sessions.db";

let cachedToken: string | null = null;

function seedAdminSession(username: string, password: string): string {
  const script = `
import hashlib
import json
import secrets
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

username = sys.argv[1]
password = sys.argv[2]
admin_db_path = Path(sys.argv[3])
session_db_path = Path(sys.argv[4])

admin_db_path.parent.mkdir(parents=True, exist_ok=True)
session_db_path.parent.mkdir(parents=True, exist_ok=True)

def hash_password(value: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", value.encode("utf-8"), salt.encode("utf-8"), 100000)
    return salt + "$" + digest.hex()

now = datetime.now(timezone.utc).isoformat()

conn = sqlite3.connect(admin_db_path)
conn.row_factory = sqlite3.Row
conn.execute(
    """
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        plan TEXT NOT NULL DEFAULT 'free',
        is_active INTEGER DEFAULT 1,
        is_suspended INTEGER DEFAULT 0,
        trial_started_at TEXT,
        trial_ends_at TEXT,
        subscription_id TEXT,
        subscription_status TEXT DEFAULT 'inactive',
        stripe_customer_id TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT '',
        last_login_at TEXT
    )
    """
)
row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
password_hash = hash_password(password)
if row:
    user_id = row["id"]
    conn.execute(
        """
        UPDATE users
        SET password_hash = ?, role = 'super_admin', plan = 'free',
            is_active = 1, is_suspended = 0, updated_at = ?
        WHERE id = ?
        """,
        (password_hash, now, user_id),
    )
else:
    user_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO users
        (id, username, password_hash, email, phone, role, plan,
         is_active, is_suspended, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'super_admin', 'free', 1, 0, ?, ?)
        """,
        (user_id, username, password_hash, "admin@telemon.io", None, now, now),
    )
conn.commit()
conn.close()

conn = sqlite3.connect(session_db_path)
conn.execute(
    """
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at REAL NOT NULL,
        expires_at REAL NOT NULL
    )
    """
)
token = f"tm_admin_{secrets.token_urlsafe(32)}"
created_at = time.time()
expires_at = created_at + 86400
conn.execute(
    "INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    (token, user_id, created_at, expires_at),
)
conn.commit()
conn.close()
print(json.dumps({"token": token, "user_id": user_id}))
  `;

  const output = execFileSync("python", ["-c", script, username, password, ADMIN_DB_PATH, SESSION_DB_PATH], {
    encoding: "utf-8",
  }).trim();
  return (JSON.parse(output) as { token: string }).token;
}

/** Returns a seeded admin token and reuses it for the rest of the run. */
export async function getAdminToken(_request: APIRequestContext): Promise<string> {
  if (cachedToken) return cachedToken;
  cachedToken = seedAdminSession(ADMIN_USERNAME, ADMIN_PASSWORD);
  return cachedToken;
}

async function authHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const token = await getAdminToken(request);
  return { Authorization: `Bearer ${token}` };
}

export async function createAccount(
  request: APIRequestContext,
  phone: string,
  name?: string
): Promise<string> {
  const res = await request.post("/api/accounts", {
    data: { phone, name },
    headers: await authHeaders(request),
  });
  if (!res.ok()) {
    throw new Error(`account create failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).id as string;
}

export async function cancelBroadcast(request: APIRequestContext, broadcastId: string): Promise<void> {
  const res = await request.post(`/api/broadcast/${broadcastId}/cancel`, {
    headers: await authHeaders(request),
  });
  if (!res.ok()) {
    throw new Error(`broadcast cancel failed: ${res.status()} ${await res.text()}`);
  }
}

export async function deleteAccount(request: APIRequestContext, accountId: string): Promise<void> {
  await request.delete(`/api/accounts/${accountId}`, { headers: await authHeaders(request) });
}

export async function fetchAccountByPhone(
  request: APIRequestContext,
  phone: string
): Promise<{ id: string; status: string } | undefined> {
  const res = await request.get("/api/accounts", { headers: await authHeaders(request) });
  const accounts = (await res.json()) as Array<{ id: string; phone: string; status: string }>;
  return accounts.find((a) => a.phone === phone);
}

export async function createBroadcast(
  request: APIRequestContext,
  params: { accountId: string; message: string; recipients: string[]; scheduledAt?: string; recurringIntervalMinutes?: number }
): Promise<string> {
  const form: Record<string, string> = {
    account_id: params.accountId,
    message: params.message,
    recipients: JSON.stringify(params.recipients),
  };
  if (params.scheduledAt) form.scheduled_at = params.scheduledAt;
  if (params.recurringIntervalMinutes != null) form.recurring_interval_minutes = String(params.recurringIntervalMinutes);
  const res = await request.post("/api/broadcast", { multipart: form, headers: await authHeaders(request) });
  if (!res.ok()) {
    throw new Error(`broadcast create failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).id as string;
}
