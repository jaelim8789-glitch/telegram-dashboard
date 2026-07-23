import { request } from "@/lib/api";

// ============================================================
// Free API Key (Telegram channel verification, no SMS OTP)
// ============================================================

export interface FreeApiKeyStart {
  token: string;
  botDeepLink: string;
  channelUrl: string;
}

export type VerifyCheckStatus = "pending_bot_start" | "verified" | "unverified";

export interface VerifyCheckResult {
  status: VerifyCheckStatus;
  reason: string | null;
}

export interface FreeApiKeyIssueResult {
  apiKey: string | null;
  detail: string;
  alreadyIssued: boolean;
}

interface ApiFreeApiKeyStart {
  token: string;
  bot_deep_link: string;
  channel_url: string;
}

interface ApiVerifyCheckResult {
  status: VerifyCheckStatus;
  reason: string | null;
}

interface ApiFreeApiKeyIssueResult {
  api_key: string | null;
  detail: string;
  already_issued: boolean;
}

export async function startFreeApiKeyVerification(): Promise<FreeApiKeyStart> {
  const body = await request<ApiFreeApiKeyStart>("/api/free-api-key/start", { method: "POST" });
  return { token: body.token, botDeepLink: body.bot_deep_link, channelUrl: body.channel_url };
}

export async function checkTelegramVerification(token: string): Promise<VerifyCheckResult> {
  const body = await request<ApiVerifyCheckResult>("/api/telegram-verify/check", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return { status: body.status, reason: body.reason };
}

export async function issueFreeApiKey(token: string, phone?: string, referralCode?: string): Promise<FreeApiKeyIssueResult> {
  const body = await request<ApiFreeApiKeyIssueResult>("/api/free-api-key/issue", {
    method: "POST",
    body: JSON.stringify({ token, phone, referral_code: referralCode }),
  });
  return { apiKey: body.api_key, detail: body.detail, alreadyIssued: body.already_issued };
}
