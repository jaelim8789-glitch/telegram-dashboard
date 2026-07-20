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

// ── Mock data for development (backend not yet available) ──────────────

const MOCK_CONTENT: Record<ContentType, string[]> = {
  quote: [
    "\"기회는 준비된 자에게 찾아온다.\"\n\n— 루이 파스퇴르\n\n오늘도 최선을 다하는 당신에게 행운이 함께하기를 바랍니다.",
    "\"성공은 최종 목적지가 아니라 여정 그 자체다.\"\n\n— 지그 지글러\n\n작은 발걸음이 모여 큰 변화를 만듭니다.",
  ],
  morning_greeting: [
    "좋은 아침입니다! 🌅\n\n오늘도 힘차게 시작하세요.\n당신의 하루가 빛나길 응원합니다.\n\n— TeleMon AI —",
    "따뜻한 아침이 찾아왔습니다.\n\n오늘 하루도 즐거운 일들로 가득하길 바랍니다.\n함께 성장하는 하루 되세요! 🌱",
  ],
  market_briefing: [
    "【오늘의 시장 동향】\n\n• 코스피: 전일대비 +0.8% (2,680pt)\n• 코스닥: 전일대비 +1.2% (890pt)\n• 원/달러: 1,320원 (보합)\n\n【주요 이슈】\n미국 연준 금리 동결 전망에 투심 회복.\n반도체·AI 섹터 강세 지속.\n\n※ 본 브리핑은 참고용입니다.",
  ],
  news_summary: [
    "【헤드라인】\n\n1. AI 반도체 시장 2027년까지 연평균 40% 성장 전망\n2. 정부, 소상공인 디지털 전환 지원 확대\n3. 글로벌 공급망 재편 가속화\n\n자세한 내용은 뉴스 앱에서 확인하세요.",
  ],
  investor_quote: [
    "\"다른 사람들이 탐욕스러울 때 두려워하고, 다른 사람들이 두려워할 때 탐욕스러워져라.\"\n\n— 워렌 버핏\n\n오늘의 시장 변동성, 두려워하지 말고 기회로 활용하세요.",
  ],
  promotion: [
    "안녕하세요, TeleMon입니다! 🚀\n\nAI 기반 스마트 메시징으로\n비즈니스 성장을 가속화하세요.\n\n✅ AI 자동 발송\n✅ 스마트 답장 추천\n✅ 실시간 분석 대시보드\n\n지금 바로 시작해보세요!",
  ],
};

const MOCK_CALENDAR_SLOTS: Record<number, CalendarSlot[]> = {
  1: [{ time: "08:00", content_type: "morning_greeting", label: "아침인사" }],
  2: [
    { time: "08:00", content_type: "morning_greeting", label: "아침인사" },
    { time: "10:00", content_type: "quote", label: "오늘의 명언" },
  ],
  3: [
    { time: "08:00", content_type: "morning_greeting", label: "아침인사" },
    { time: "10:00", content_type: "quote", label: "오늘의 명언" },
    { time: "12:00", content_type: "market_briefing", label: "시장브리핑" },
  ],
  4: [
    { time: "08:00", content_type: "morning_greeting", label: "아침인사" },
    { time: "10:00", content_type: "quote", label: "오늘의 명언" },
    { time: "12:00", content_type: "market_briefing", label: "시장브리핑" },
    { time: "15:00", content_type: "news_summary", label: "뉴스요약" },
  ],
  5: [
    { time: "08:00", content_type: "morning_greeting", label: "아침인사" },
    { time: "10:00", content_type: "quote", label: "오늘의 명언" },
    { time: "12:00", content_type: "market_briefing", label: "시장브리핑" },
    { time: "15:00", content_type: "news_summary", label: "뉴스요약" },
    { time: "18:00", content_type: "investor_quote", label: "투자명언" },
  ],
};

// ── API functions ──────────────────────────────────────────────────────

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentResponse> {
  try {
    return await request<GenerateContentResponse>("/api/ai/content-studio/generate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    // Backend not available — return mock data
    const mockItems = MOCK_CONTENT[input.content_type] ?? MOCK_CONTENT.quote;
    return {
      content_type: input.content_type,
      tone: input.tone,
      generated_content: mockItems[0] ?? "",
      tokens_used: 0,
      style_profile_id: input.style_profile_id ?? null,
    };
  }
}

export async function previewCalendar(input: CalendarPreviewInput): Promise<CalendarPreviewResponse> {
  try {
    return await request<CalendarPreviewResponse>("/api/ai/content-studio/calendar/preview", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    const slots = MOCK_CALENDAR_SLOTS[input.daily_count] ?? MOCK_CALENDAR_SLOTS[3]!;
    return { slots };
  }
}