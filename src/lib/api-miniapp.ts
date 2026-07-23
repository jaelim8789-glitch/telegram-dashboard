/**
 * Mini App 전용 API 함수 — Telegram Mini App 환경에 최적화.
 */

import { request } from './api';
import type { BroadcastStatus } from '@/types';

// ── Telegram initData 인증 ──────────────────────────────────────────

export interface MiniAppAuthResult {
  token: string;
  session_token: string;
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };
}

export async function authenticateMiniApp(initData: string): Promise<MiniAppAuthResult> {
  return request<MiniAppAuthResult>('/api/auth/miniapp-login', {
    method: 'POST',
    body: JSON.stringify({ init_data: initData }),
  });
}

// ── 토큰 잔액 ──────────────────────────────────────────────────────

export async function fetchTokenBalance(): Promise<number> {
  try {
    const res = await request<{ balance: number }>('/api/user/token-balance');
    return res.balance;
  } catch {
    return 0;
  }
}

// ── 계정 건강 상태 ─────────────────────────────────────────────────

export async function fetchAccountHealthScore(accountId: string): Promise<number> {
  try {
    const res = await request<{ health_score: number }>(`/api/accounts/${accountId}/health-score`);
    return res.health_score;
  } catch {
    return 0;
  }
}

export async function fetchAccountDetails(accountId: string): Promise<{ healthScore: number; lastActive: string }> {
  try {
    const [healthScore, account] = await Promise.all([
      fetchAccountHealthScore(accountId),
      request<{ last_activity: string | null }>(`/api/accounts/${accountId}/status`),
    ]);
    return {
      healthScore,
      lastActive: account.last_activity ?? new Date().toISOString(),
    };
  } catch {
    return { healthScore: 0, lastActive: new Date().toISOString() };
  }
}

// ── 최근 발송 내역 ──────────────────────────────────────────────────

export interface RecentBroadcast {
  id: string;
  message: string;
  status: BroadcastStatus;
  sentAt: string;
  recipients: number;
}

export async function fetchRecentBroadcasts(): Promise<RecentBroadcast[]> {
  try {
    const logs = await request<{ id: string; message: string; status: BroadcastStatus; sent_at: string; created_at: string; recipient_count: number }[]>('/api/logs/recent');
    return logs.slice(0, 5).map((log) => ({
      id: log.id,
      message: log.message.length > 50 ? log.message.substring(0, 50) + '...' : log.message,
      status: log.status,
      sentAt: log.sent_at || log.created_at,
      recipients: log.recipient_count,
    }));
  } catch {
    return [];
  }
}

// ── 빠른 발송 ──────────────────────────────────────────────────────

export async function quickSendToTopGroups(accountId: string, message: string, groupLimit: number = 5): Promise<{ success: boolean; message: string; sentCount?: number }> {
  try {
    const groups = await request<{ id: string }[]>(`/api/accounts/${accountId}/groups?page_size=${groupLimit}`);
    if (groups.length === 0) return { success: false, message: '발송 가능한 그룹이 없습니다.' };
    const selectedGroups = groups.slice(0, groupLimit);
    await request<{ id: string }>('/api/broadcast/send-group', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, message, group_ids: selectedGroups.map((g) => g.id), delivery_mode: 'normal' }),
    });
    return { success: true, message: `${selectedGroups.length}개 그룹에 발송 완료!`, sentCount: selectedGroups.length };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : '발송에 실패했습니다.' };
  }
}

// ── 미니앱 전용: 간략 대시보드 요약 ────────────────────────────────

export interface MiniAppDashboardSummary {
  activeAccounts: number;
  todaySent: number;
  successRate: number;
  queueCount: number;
  tokenBalance: number;
}

export async function fetchMiniAppDashboardSummary(): Promise<MiniAppDashboardSummary> {
  try {
    const [accounts, scheduler, tokens] = await Promise.all([
      request<{ items: { status: string }[] }>('/api/accounts').then((res) => res.items ?? []),
      request<{ due_broadcasts_count: number }>('/api/scheduler/status').catch(() => ({ due_broadcasts_count: 0 })),
      fetchTokenBalance(),
    ]);
    const activeAccounts = accounts.filter((a) => a.status === 'active').length;
    return { activeAccounts, todaySent: 0, successRate: 0, queueCount: scheduler.due_broadcasts_count, tokenBalance: tokens };
  } catch {
    return { activeAccounts: 0, todaySent: 0, successRate: 0, queueCount: 0, tokenBalance: 0 };
  }
}

// ── 미니앱 전용: AI 채팅 요약 ───────────────────────────────────────

export interface MiniAppAiSummary {
  recentChats: { id: string; title: string; updatedAt: string }[];
  totalMessages: number;
}

export async function fetchMiniAppAiSummary(): Promise<MiniAppAiSummary> {
  try {
    const agents = await request<{ id: string; name: string; total_messages: number }[]>('/api/ai/agents');
    const totalMessages = agents.reduce((sum, a) => sum + a.total_messages, 0);
    return {
      recentChats: agents.map((a) => ({ id: a.id, title: a.name, updatedAt: '' })),
      totalMessages,
    };
  } catch {
    return { recentChats: [], totalMessages: 0 };
  }
}
