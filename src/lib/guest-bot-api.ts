/**
 * Guest Bot API Client
 *
 * TeleMon Bot의 Guest Mode 설정/통계를 관리합니다.
 * @TeleMonBot Guest Mode + Ephemeral Messages 설정 API
 */

import { request } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

export interface GuestStats {
  enabled: boolean;
  daily_limit: number;
  unique_users_today: number;
  total_requests_today: number;
  daily_usage: Record<string, number>;
}

export interface DailyLimitResponse {
  daily_limit: number;
  updated: boolean;
}

export interface WebhookRefreshResponse {
  ok: boolean;
  result?: Record<string, unknown>;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  allowed_updates?: string[];
  [key: string]: unknown;
}

// ── API Functions ─────────────────────────────────────────────────

/**
 * Guest Mode 사용 통계 조회 (관리자 전용)
 */
export async function fetchGuestStats(): Promise<GuestStats> {
  return request<GuestStats>("/api/bot/guest/stats");
}

/**
 * 일일 무료 사용 한도 설정 (관리자 전용)
 */
export async function setGuestDailyLimit(limit: number): Promise<DailyLimitResponse> {
  return request<DailyLimitResponse>("/api/bot/guest/daily-limit", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
}

/**
 * Webhook allowed_updates 갱신 (guest_message 활성화)
 */
export async function refreshGuestWebhook(): Promise<WebhookRefreshResponse> {
  return request<WebhookRefreshResponse>("/api/bot/guest/webhook-refresh", {
    method: "POST",
  });
}

/**
 * 현재 Webhook 설정 상태 조회
 */
export async function fetchWebhookInfo(): Promise<WebhookInfo> {
  return request<WebhookInfo>("/api/bot/guest/webhook-info");
}
