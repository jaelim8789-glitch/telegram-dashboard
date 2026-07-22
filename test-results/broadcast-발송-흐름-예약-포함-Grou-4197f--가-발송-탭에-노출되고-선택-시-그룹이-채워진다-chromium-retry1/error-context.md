# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: broadcast.spec.ts >> 발송 흐름 (예약 포함) >> Groups 페이지에서 만든 폴더(발송 그룹)가 발송 탭에 노출되고 선택 시 그룹이 채워진다
- Location: e2e\broadcast.spec.ts:32:7

# Error details

```
Error: account create failed: 401 {"detail":"인증이 필요합니다."}
```

# Test source

```ts
  50  |     """
  51  |     CREATE TABLE IF NOT EXISTS users (
  52  |         id TEXT PRIMARY KEY,
  53  |         username TEXT UNIQUE NOT NULL,
  54  |         password_hash TEXT NOT NULL,
  55  |         email TEXT,
  56  |         phone TEXT,
  57  |         role TEXT NOT NULL DEFAULT 'user',
  58  |         plan TEXT NOT NULL DEFAULT 'free',
  59  |         is_active INTEGER DEFAULT 1,
  60  |         is_suspended INTEGER DEFAULT 0,
  61  |         trial_started_at TEXT,
  62  |         trial_ends_at TEXT,
  63  |         subscription_id TEXT,
  64  |         subscription_status TEXT DEFAULT 'inactive',
  65  |         stripe_customer_id TEXT,
  66  |         created_at TEXT DEFAULT '',
  67  |         updated_at TEXT DEFAULT '',
  68  |         last_login_at TEXT
  69  |     )
  70  |     """
  71  | )
  72  | row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
  73  | password_hash = hash_password(password)
  74  | if row:
  75  |     user_id = row["id"]
  76  |     conn.execute(
  77  |         """
  78  |         UPDATE users
  79  |         SET password_hash = ?, role = 'super_admin', plan = 'free',
  80  |             is_active = 1, is_suspended = 0, updated_at = ?
  81  |         WHERE id = ?
  82  |         """,
  83  |         (password_hash, now, user_id),
  84  |     )
  85  | else:
  86  |     user_id = str(uuid.uuid4())
  87  |     conn.execute(
  88  |         """
  89  |         INSERT INTO users
  90  |         (id, username, password_hash, email, phone, role, plan,
  91  |          is_active, is_suspended, created_at, updated_at)
  92  |         VALUES (?, ?, ?, ?, ?, 'super_admin', 'free', 1, 0, ?, ?)
  93  |         """,
  94  |         (user_id, username, password_hash, "admin@telemon.io", None, now, now),
  95  |     )
  96  | conn.commit()
  97  | conn.close()
  98  | 
  99  | conn = sqlite3.connect(session_db_path)
  100 | conn.execute(
  101 |     """
  102 |     CREATE TABLE IF NOT EXISTS sessions (
  103 |         token TEXT PRIMARY KEY,
  104 |         user_id TEXT NOT NULL,
  105 |         created_at REAL NOT NULL,
  106 |         expires_at REAL NOT NULL
  107 |     )
  108 |     """
  109 | )
  110 | token = f"tm_admin_{secrets.token_urlsafe(32)}"
  111 | created_at = time.time()
  112 | expires_at = created_at + 86400
  113 | conn.execute(
  114 |     "INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  115 |     (token, user_id, created_at, expires_at),
  116 | )
  117 | conn.commit()
  118 | conn.close()
  119 | print(json.dumps({"token": token, "user_id": user_id}))
  120 |   `;
  121 | 
  122 |   const output = execFileSync("python", ["-c", script, username, password, ADMIN_DB_PATH, SESSION_DB_PATH], {
  123 |     encoding: "utf-8",
  124 |   }).trim();
  125 |   return (JSON.parse(output) as { token: string }).token;
  126 | }
  127 | 
  128 | /** Returns a seeded admin token and reuses it for the rest of the run. */
  129 | export async function getAdminToken(_request: APIRequestContext): Promise<string> {
  130 |   if (cachedToken) return cachedToken;
  131 |   cachedToken = seedAdminSession(ADMIN_USERNAME, ADMIN_PASSWORD);
  132 |   return cachedToken;
  133 | }
  134 | 
  135 | async function authHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  136 |   const token = await getAdminToken(request);
  137 |   return { Authorization: `Bearer ${token}` };
  138 | }
  139 | 
  140 | export async function createAccount(
  141 |   request: APIRequestContext,
  142 |   phone: string,
  143 |   name?: string
  144 | ): Promise<string> {
  145 |   const res = await request.post("/api/accounts", {
  146 |     data: { phone, name },
  147 |     headers: await authHeaders(request),
  148 |   });
  149 |   if (!res.ok()) {
> 150 |     throw new Error(`account create failed: ${res.status()} ${await res.text()}`);
      |           ^ Error: account create failed: 401 {"detail":"인증이 필요합니다."}
  151 |   }
  152 |   return (await res.json()).id as string;
  153 | }
  154 | 
  155 | export async function cancelBroadcast(request: APIRequestContext, broadcastId: string): Promise<void> {
  156 |   const res = await request.post(`/api/broadcast/${broadcastId}/cancel`, {
  157 |     headers: await authHeaders(request),
  158 |   });
  159 |   if (!res.ok()) {
  160 |     throw new Error(`broadcast cancel failed: ${res.status()} ${await res.text()}`);
  161 |   }
  162 | }
  163 | 
  164 | export async function deleteAccount(request: APIRequestContext, accountId: string): Promise<void> {
  165 |   await request.delete(`/api/accounts/${accountId}`, { headers: await authHeaders(request) });
  166 | }
  167 | 
  168 | export async function fetchAccountByPhone(
  169 |   request: APIRequestContext,
  170 |   phone: string
  171 | ): Promise<{ id: string; status: string } | undefined> {
  172 |   const res = await request.get("/api/accounts", { headers: await authHeaders(request) });
  173 |   const accounts = (await res.json()) as Array<{ id: string; phone: string; status: string }>;
  174 |   return accounts.find((a) => a.phone === phone);
  175 | }
  176 | 
  177 | export async function createFolder(
  178 |   request: APIRequestContext,
  179 |   params: { accountId: string; name: string; groupIds: string[] }
  180 | ): Promise<string> {
  181 |   const res = await request.post(`/api/accounts/${params.accountId}/folders`, {
  182 |     data: { name: params.name, group_ids: params.groupIds },
  183 |     headers: await authHeaders(request),
  184 |   });
  185 |   if (!res.ok()) {
  186 |     throw new Error(`folder create failed: ${res.status()} ${await res.text()}`);
  187 |   }
  188 |   return (await res.json()).id as string;
  189 | }
  190 | 
  191 | export async function createBroadcast(
  192 |   request: APIRequestContext,
  193 |   params: { accountId: string; message: string; recipients: string[]; scheduledAt?: string; recurringIntervalMinutes?: number }
  194 | ): Promise<string> {
  195 |   const form: Record<string, string> = {
  196 |     account_id: params.accountId,
  197 |     message: params.message,
  198 |     recipients: JSON.stringify(params.recipients),
  199 |   };
  200 |   if (params.scheduledAt) form.scheduled_at = params.scheduledAt;
  201 |   if (params.recurringIntervalMinutes != null) form.recurring_interval_minutes = String(params.recurringIntervalMinutes);
  202 |   const res = await request.post("/api/broadcast", { multipart: form, headers: await authHeaders(request) });
  203 |   if (!res.ok()) {
  204 |     throw new Error(`broadcast create failed: ${res.status()} ${await res.text()}`);
  205 |   }
  206 |   return (await res.json()).id as string;
  207 | }
  208 | 
```