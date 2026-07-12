import { request } from "@/lib/api";

// ============================================================
// Bulk Link Inspector API
// ============================================================

export type LinkStatus = "active" | "private" | "dead" | "flood_wait" | "error";

export interface LinkInspectionItem {
  rawLink: string;
  status: LinkStatus;
  accessible: boolean;
  title: string | null;
  chatType: string | null;
  username: string | null;
  chatId: string | null;
  participantsCount: number | null;
  reason: string | null;
}

export interface LinkInspectResult {
  items: LinkInspectionItem[];
  totalSubmitted: number;
  duplicatesRemoved: number;
  totalInspected: number;
}

export interface LinkJoinTarget {
  rawLink: string;
  title: string;
}

export interface LinkJoinResultItem {
  chatId: string | null;
  title: string;
  success: boolean;
  error: string | null;
}

interface ApiLinkInspectionItem {
  raw_link: string;
  status: LinkStatus;
  accessible: boolean;
  title: string | null;
  chat_type: string | null;
  username: string | null;
  chat_id: string | null;
  participants_count: number | null;
  reason: string | null;
}

interface ApiLinkInspectResponse {
  items: ApiLinkInspectionItem[];
  total_submitted: number;
  duplicates_removed: number;
  total_inspected: number;
}

interface ApiLinkJoinResultItem {
  chat_id: string | null;
  title: string;
  success: boolean;
  error: string | null;
}

function toInspectionItem(api: ApiLinkInspectionItem): LinkInspectionItem {
  return {
    rawLink: api.raw_link,
    status: api.status,
    accessible: api.accessible,
    title: api.title,
    chatType: api.chat_type,
    username: api.username,
    chatId: api.chat_id,
    participantsCount: api.participants_count,
    reason: api.reason,
  };
}

export async function inspectLinks(accountId: string, links: string[]): Promise<LinkInspectResult> {
  const body = await request<ApiLinkInspectResponse>("/api/link-inspector/inspect", {
    method: "POST",
    body: JSON.stringify({ account_id: accountId, links }),
  });
  return {
    items: body.items.map(toInspectionItem),
    totalSubmitted: body.total_submitted,
    duplicatesRemoved: body.duplicates_removed,
    totalInspected: body.total_inspected,
  };
}

export async function joinInspectedLinks(accountId: string, targets: LinkJoinTarget[]): Promise<LinkJoinResultItem[]> {
  const body = await request<{ items: ApiLinkJoinResultItem[] }>("/api/link-inspector/join", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      targets: targets.map((t) => ({ raw_link: t.rawLink, title: t.title })),
    }),
  });
  return body.items.map((r) => ({ chatId: r.chat_id, title: r.title, success: r.success, error: r.error }));
}
