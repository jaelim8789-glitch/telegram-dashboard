/**
 * AI Draft + Human Approval API Client
 *
 * AI가 생성한 콘텐츠를 Draft 상태로 저장 → 사용자 검토/승인/거절.
 */

import { request } from "@/lib/api";

export interface Draft {
  id: string;
  user_id: string;
  account_id: string | null;
  title: string;
  content: string;
  content_type: string;
  status: "draft" | "approved" | "rejected" | "scheduled" | "sent";
  source: string;
  ai_model: string | null;
  tokens_used: number;
  scheduled_at: string | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftSummary {
  draft: number;
  approved: number;
  rejected: number;
  scheduled: number;
  sent: number;
  total: number;
}

/** Draft 목록 조회 */
export async function fetchDrafts(status?: string): Promise<Draft[]> {
  const params = status ? `?status=${status}` : "";
  const res = await request<{ drafts: Draft[] }>(`/api/drafts${params}`);
  return res.drafts;
}

/** Draft 생성 (AI 콘텐츠 저장) */
export async function createDraft(body: {
  title?: string;
  content: string;
  content_type?: string;
  source?: string;
  account_id?: string;
  ai_model?: string;
  tokens_used?: number;
}): Promise<{ id: string; status: string }> {
  return request("/api/drafts", { method: "POST", body: JSON.stringify(body) });
}

/** Draft 단건 조회 */
export async function fetchDraft(id: string): Promise<Draft> {
  return request<Draft>(`/api/drafts/${id}`);
}

/** Draft 수정 */
export async function updateDraft(id: string, body: Partial<Pick<Draft, "title" | "content">>): Promise<void> {
  await request(`/api/drafts/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export interface ApproveDraftOptions {
  scheduledAt?: string;
  feedback?: string;
  /** 발송 대상 그룹 ID 목록 */
  recipients?: string[];
  /** 발송 계정 ID (draft에 없을 경우) */
  accountId?: string;
}

/** Draft 승인 (선택적 예약 발송 + recipients) */
export async function approveDraft(
  id: string,
  opts: ApproveDraftOptions = {}
): Promise<{ status: string; broadcast_id?: string; recipients_count?: number }> {
  const body: Record<string, unknown> = {};
  if (opts.scheduledAt) body.scheduled_at = opts.scheduledAt;
  if (opts.feedback) body.feedback = opts.feedback;
  if (opts.recipients && opts.recipients.length > 0) body.recipients = opts.recipients;
  if (opts.accountId) body.account_id = opts.accountId;
  return request(`/api/drafts/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Draft 거절 */
export async function rejectDraft(id: string, feedback?: string): Promise<{ status: string }> {
  return request(`/api/drafts/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ feedback }),
  });
}

/** Draft 삭제 */
export async function deleteDraft(id: string): Promise<void> {
  await request(`/api/drafts/${id}`, { method: "DELETE" });
}

/** Draft 통계 */
export async function fetchDraftSummary(): Promise<DraftSummary> {
  return request<DraftSummary>("/api/drafts/stats/summary");
}
