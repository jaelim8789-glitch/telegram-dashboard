import type { APIRequestContext } from "@playwright/test";

let counter = 0;

/** A phone number unique enough not to collide with a previous/concurrent test run. */
export function uniquePhone(): string {
  counter += 1;
  const suffix = `${Date.now()}`.slice(-7) + counter;
  return `+8210${suffix}`.slice(0, 15);
}

/** Matches this repo's default .env — override via env vars if you've changed them. */
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "123123";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "123456";

let cachedToken: string | null = null;

/** Logs in once per test run and reuses the token — every helper below needs one since
 * all /api/* routes require either this or an X-API-Key (see app/api/deps.py). */
export async function getAdminToken(request: APIRequestContext): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await request.post("/api/admin/login", {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`관리자 로그인 실패 (setup): ${res.status()} ${await res.text()}`);
  }
  cachedToken = (await res.json()).access_token as string;
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
    throw new Error(`계정 생성 실패 (setup): ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).id as string;
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
  params: { accountId: string; message: string; recipients: string[]; scheduledAt?: string }
): Promise<string> {
  const form = {
    account_id: params.accountId,
    message: params.message,
    recipients: JSON.stringify(params.recipients),
    ...(params.scheduledAt ? { scheduled_at: params.scheduledAt } : {}),
  };
  const res = await request.post("/api/broadcast", { multipart: form, headers: await authHeaders(request) });
  if (!res.ok()) {
    throw new Error(`발송 생성 실패 (setup): ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).id as string;
}
