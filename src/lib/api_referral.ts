import { request } from "@/lib/api";

// ── Referral API ──────────────────────────────────────────────────

export interface ReferralCodeInfo {
  code: string;
  created_at: string;
  is_active: boolean;
  uses: number;
}

export interface ReferralCommission {
  id: string;
  referred_id: string;
  amount_cents: number;
  rate: number;
  status: string;
  payment_tx_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface ReferralStats {
  referral_code: string;
  total_referred: number;
  total_earnings_cents: number;
  uses: number;
}

export interface RegisterDistributorResponse {
  success: boolean;
  message: string;
  is_distributor: boolean;
}

export interface DistributorStatus {
  isDistributor: boolean;
}

export async function getMyReferralCode(): Promise<ReferralCodeInfo> {
  return request("/api/referral/code");
}

export async function regenerateReferralCode(): Promise<ReferralCodeInfo> {
  return request("/api/referral/code", {
    method: "POST",
  });
}

export async function getMyCommissions(): Promise<{ items: ReferralCommission[] }> {
  return request("/api/referral/commissions");
}

export async function getReferralStats(): Promise<ReferralStats> {
  return request("/api/referral/stats");
}

export async function registerAsDistributor(): Promise<RegisterDistributorResponse> {
  return request("/api/referral/register-distributor", {
    method: "POST",
  });
}

export async function checkDistributorStatus(): Promise<DistributorStatus> {
  try {
    // Use the new endpoint to check distributor status
    const response = await request<{ is_distributor: boolean }>("/api/referral/distributor-status");
    return { isDistributor: response.is_distributor };
  } catch (error) {
    // If there's an error, assume user is not a distributor
    console.error('Error checking distributor status:', error);
    return { isDistributor: false };
  }
}