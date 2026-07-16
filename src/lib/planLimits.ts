/**
 * Plan limit definitions — matches telegram-dashboard-backend/app/core/plans.py
 * Single source of truth for frontend usage dashboard.
 */
export type PlanId = "free" | "pro" | "team";

export interface PlanLimits {
  maxAccounts: number;
  maxAutoReplyRules: number;
  maxReplyMacros: number;
  monthlyMessageLimit: number;
  monthlyAutoReplyLimit: number;
  monthlyAiChatLimit: number;
  cooldownMinimumMinutes: number;
  canBroadcast: boolean;
  canSchedule: boolean;
  canAttachImages: boolean;
  canExportData: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxAccounts: 1,
    maxAutoReplyRules: 3,
    maxReplyMacros: 1,
    monthlyMessageLimit: 100,
    monthlyAutoReplyLimit: 100,
    monthlyAiChatLimit: 20,
    cooldownMinimumMinutes: 60,
    canBroadcast: true,
    canSchedule: false,
    canAttachImages: false,
    canExportData: false,
  },
  pro: {
    maxAccounts: 10,
    maxAutoReplyRules: 100,
    maxReplyMacros: 50,
    monthlyMessageLimit: 50000,
    monthlyAutoReplyLimit: 50000,
    monthlyAiChatLimit: 1000,
    cooldownMinimumMinutes: 0,
    canBroadcast: true,
    canSchedule: true,
    canAttachImages: true,
    canExportData: true,
  },
  team: {
    maxAccounts: 20,
    maxAutoReplyRules: 250,
    maxReplyMacros: 100,
    monthlyMessageLimit: 200000,
    monthlyAutoReplyLimit: 200000,
    monthlyAiChatLimit: 3000,
    cooldownMinimumMinutes: 0,
    canBroadcast: true,
    canSchedule: true,
    canAttachImages: true,
    canExportData: true,
  },
};

export function getPlanLimits(planId: string): PlanLimits {
  return PLAN_LIMITS[planId as PlanId] ?? PLAN_LIMITS.free;
}

export function getLimitPercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(Math.round((used / limit) * 100), 100);
}

export function getLimitVariant(percent: number): "success" | "warning" | "danger" {
  if (percent >= 90) return "danger";
  if (percent >= 70) return "warning";
  return "success";
}

export function formatLimitValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}
