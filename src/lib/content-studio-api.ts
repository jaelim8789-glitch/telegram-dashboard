"use client";

import { request } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────

export type ContentType = "promotional" | "announcement" | "engagement" | "informational" | "testimonial" | "event";

export const CONTENT_TYPES: { id: ContentType; label: string; description: string; emoji: string }[] = [
  { id: "promotional",     label: "홍보글",      description: "상품/서비스 홍보 메시지",         emoji: "📢" },
  { id: "announcement",    label: "공지사항",    description: "짧고 명확한 공지 메시지",       emoji: "📣" },
  { id: "engagement",      label: "참여유도",    description: "커뮤니티 참여 유도",            emoji: "💬" },
  { id: "informational",   label: "정보전달",    description: "핵심 정보 요약 메시지",         emoji: "📰" },
  { id: "testimonial",     label: "고객후기",    description: "후기/리뷰 스타일 메시지",       emoji: "⭐" },
  { id: "event",           label: "이벤트",      description: "이벤트 안내/홍보 메시지",       emoji: "🎉" },
];

export type ContentTone = "short" | "emotional" | "intense";

export interface GenerateContentInput {
  content_type: ContentType;
  tone: ContentTone;
  topic?: string;
  context?: string;
  style_profile_id?: string;
}

export interface GeneratedContentItem {
  content_type: string;
  tone: string;
  generated_content: string;
  tokens_used: number;
  style_profile_id?: string | null;
}

export interface GenerateContentResponse {
  content_type: string;
  tone: string;
  generated_content: string;
  tokens_used: number;
  style_profile_id?: string | null;
}

// ── API functions ──────────────────────────────────────────────────────

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentResponse> {
  return request<GenerateContentResponse>("/api/ai/content-studio/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
