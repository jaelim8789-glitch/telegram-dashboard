"use client";

import { request } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────

export type ContentType =
  | "quote"           // 오늘의 명언
  | "morning_greeting" // 아침인사
  | "market_briefing"  // 시장브리핑
  | "news_summary"     // 뉴스요약
  | "investor_quote"   // 투자명언
  | "promotion";       // 홍보글

export const CONTENT_TYPES: { id: ContentType; label: string; description: string; emoji: string }[] = [
  { id: "quote",            label: "오늘의 명언",   description: "짧은 명언으로 하루를 시작",         emoji: "💬" },
  { id: "morning_greeting", label: "아침인사",      description: "따뜻한 아침 인사 메시지",          emoji: "🌅" },
  { id: "market_briefing",  label: "시장브리핑",    description: "오늘의 시장 동향 요약",            emoji: "📊" },
  { id: "news_summary",     label: "뉴스요약",      description: "주요 뉴스 요약",                  emoji: "📰" },
  { id: "investor_quote",   label: "투자명언",      description: "투자자에게 영감을 주는 명언",      emoji: "💎" },
  { id: "promotion",        label: "홍보글",        description: "서비스/상품 홍보 메시지",          emoji: "📢" },
];

export type ContentTone = "professional" | "friendly" | "warm" | "casual";

export interface GenerateContentInput {
  content_type: ContentType;
  tone: ContentTone;
  topic?: string;
  context?: string;
  /** StyleProfile ID — OpenCode 말투학습 연동 */
  style_profile_id?: string;
}

export interface GeneratedContentItem {
  content_type: string;
  tone: string;
  generated_content: string;
  tokens_used: number;
  style_profile_id?: string | null;
}

export type GenerateContentResponse = GeneratedContentItem;

export interface CalendarSlot {
  time: string;
  content_type: ContentType;
  label: string;
}

export interface CalendarPreviewInput {
  daily_count: number;
  content_types: ContentType[];
}

export interface CalendarPreviewResponse {
  slots: CalendarSlot[];
}

// ── API functions ──────────────────────────────────────────────────────

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentResponse> {
  return request<GenerateContentResponse>("/api/ai/content-studio/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function previewCalendar(input: CalendarPreviewInput): Promise<CalendarPreviewResponse> {
  return request<CalendarPreviewResponse>("/api/ai/content-studio/calendar/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
