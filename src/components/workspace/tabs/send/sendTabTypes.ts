import type { BroadcastStatus, GroupType } from "@/types";
import { Users, Users2, Megaphone, type LucideIcon } from "lucide-react";

export type SortMode = "default" | "members" | "favorites";
export type HistoryFilter = BroadcastStatus | "all" | "recurring";
export type DeliveryPreset = "safe" | "balanced" | "fast";

export const POLL_INTERVAL_MS = 3000;
export const HISTORY_POLL_INTERVAL_MS = 30000;

// Mirrors GroupTab's type taxonomy so a group/channel filters identically in both places.
export const TYPE_LABEL: Record<GroupType, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};
export const TYPE_ICON: Record<GroupType, LucideIcon> = {
  group: Users,
  megagroup: Users2,
  channel: Megaphone,
};

export const FILTER_ORDER: HistoryFilter[] = ["all", "pending", "sending", "sent", "failed", "cancelled"];

export const FILTER_LABEL: Record<HistoryFilter, string> = {
  all: "전체",
  pending: "대기",
  sending: "발송 중",
  sent: "완료",
  failed: "실패",
  cancelled: "취소",
  recurring: "반복",
};

export const DELIVERY_PRESET_LABEL: Record<DeliveryPreset, string> = {
  safe: "안전 우선",
  balanced: "균형",
  fast: "속도 우선",
};

// 답장매크로 "중복 제거" — 계정+답장 대상 메시지 ID 조합
export function replyDedupeKey(accountId: string, replyToMessageId: string) {
  return `telemon-reply-dedupe:${accountId}:${replyToMessageId}`;
}
export function loadReplyDedupeSet(accountId: string, replyToMessageId: string): Set<string> {
  try {
    const raw = localStorage.getItem(replyDedupeKey(accountId, replyToMessageId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
export function addToReplyDedupeSet(accountId: string, replyToMessageId: string, recipientIds: string[]) {
  try {
    const key = replyDedupeKey(accountId, replyToMessageId);
    const existing = loadReplyDedupeSet(accountId, replyToMessageId);
    recipientIds.forEach((id) => existing.add(id));
    localStorage.setItem(key, JSON.stringify([...existing]));
  } catch { /* ignore */ }
}
export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
