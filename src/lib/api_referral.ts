import { request } from "@/lib/api";

// ── Types ───────────────────────────────────────────────────────────

export interface ReferralCodeInfo {
  code: string;
  referral_code_id: string;
}

export interface ReferralReferredUser {
  tenant_id: string;
  phone: string;
  plan: string;
  has_paid: boolean;
  joined_at: string | null;
}

export interface ReferralDashboardResponse {
  my_code: string | null;
  referral_code_id: string | null;
  referred_users: ReferralReferredUser[];
  pending_commission_total: number;
  paid_commission_total: number;
}

export interface CommissionItem {
  id: string;
  referred_user_phone: string;
  source_type: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

export interface MyCommissionsResponse {
  items: CommissionItem[];
  total_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  referrer_id: string;
  phone: string;
  referral_count: number;
  total_commission_earned: number;
  tier: string;
}

export interface PayoutRecord {
  id: string;
  referrer_id: string;
  referrer_phone: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export interface RegisterDistributorResponse {
  success: boolean;
  message: string;
  is_distributor: boolean;
}

export interface DistributorStatus {
  isDistributor: boolean;
}

// ── API Functions ───────────────────────────────────────────────────

export async function getMyReferralCode(): Promise<ReferralCodeInfo> {
  return request("/api/referral/code");
}

export async function generateReferralCode(): Promise<ReferralCodeInfo> {
  return request("/api/referral/generate", { method: "POST" });
}

export async function getMyCommissions(page = 1): Promise<MyCommissionsResponse> {
  return request(`/api/referral/commissions?page=${page}`);
}

export async function getReferralDashboard(): Promise<ReferralDashboardResponse> {
  return request("/api/referral/dashboard");
}

export async function registerAsDistributor(): Promise<RegisterDistributorResponse> {
  return request("/api/referral/register-distributor", { method: "POST" });
}

export async function checkDistributorStatus(): Promise<DistributorStatus> {
  try {
    const response = await request<{ is_distributor: boolean }>("/api/referral/distributor-status");
    return { isDistributor: response.is_distributor };
  } catch {
    return { isDistributor: false };
  }
}

export async function setWalletAddress(wallet: string): Promise<{ success: boolean }> {
  return request("/api/referral/set-wallet", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet }),
  });
}

export async function getPayoutHistory(): Promise<{ items: PayoutRecord[]; total_count: number }> {
  return request("/api/referral/payouts");
}

export async function requestPayout(): Promise<{ success: boolean; message: string }> {
  return request("/api/referral/request-payout", { method: "POST" });
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const result = await request<{ items: LeaderboardEntry[] }>("/api/referral/leaderboard");
  return result.items;
}

export async function getMyReferralLink(): Promise<{ link: string; code: string }> {
  return request("/api/referral/my-link");
}
