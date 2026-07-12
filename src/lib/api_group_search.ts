import { request } from "@/lib/api";

// ============================================================
// Group Search API
// ============================================================

export interface GroupSearchResult {
  id: string;
  accountId: string;
  keyword: string;
  chatId: string;
  title: string;
  chatType: string | null;
  username: string | null;
  participantsCount: number | null;
  about: string | null;
  isJoined: boolean;
  createdAt: string;
}

export interface JoinInfo {
  joinedToday: number;
  maxDaily: number;
  remaining: number;
}

export interface GroupJoinLog {
  id: string;
  accountId: string;
  chatId: string;
  title: string;
  username: string | null;
  keyword: string;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface ApiGroupSearchResult {
  id: string;
  account_id: string;
  keyword: string;
  chat_id: string;
  title: string;
  chat_type: string | null;
  username: string | null;
  participants_count: number | null;
  about: string | null;
  is_joined: boolean;
  created_at: string;
}

interface ApiGroupJoinLog {
  id: string;
  account_id: string;
  chat_id: string;
  title: string;
  username: string | null;
  keyword: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface ApiJoinInfo {
  joined_today: number;
  max_daily: number;
  remaining: number;
}

function toSearchResult(api: ApiGroupSearchResult): GroupSearchResult {
  return {
    id: api.id,
    accountId: api.account_id,
    keyword: api.keyword,
    chatId: api.chat_id,
    title: api.title,
    chatType: api.chat_type,
    username: api.username,
    participantsCount: api.participants_count,
    about: api.about,
    isJoined: api.is_joined,
    createdAt: api.created_at,
  };
}

function toJoinLog(api: ApiGroupJoinLog): GroupJoinLog {
  return {
    id: api.id,
    accountId: api.account_id,
    chatId: api.chat_id,
    title: api.title,
    username: api.username,
    keyword: api.keyword,
    success: api.success,
    errorMessage: api.error_message,
    createdAt: api.created_at,
  };
}

export async function searchGroups(accountId: string, keyword: string): Promise<GroupSearchResult[]> {
  const body = await request<{ items: ApiGroupSearchResult[] }>("/api/group-search/search", {
    method: "POST",
    body: JSON.stringify({ account_id: accountId, keyword }),
  });
  return (body.items ?? body).map(toSearchResult);
}

export async function fetchSearchResults(accountId: string): Promise<GroupSearchResult[]> {
  const body = await request<{ items: ApiGroupSearchResult[] }>(`/api/group-search/results/${accountId}`);
  return (body.items ?? body).map(toSearchResult);
}

export async function joinSelectedGroups(resultIds: string[]): Promise<{ chat_id: string; title: string; success: boolean; error: string | null }[]> {
  return request("/api/group-search/join", {
    method: "POST",
    body: JSON.stringify({ result_ids: resultIds }),
  });
}

export async function getJoinInfo(accountId: string): Promise<JoinInfo> {
  const info = await request<ApiJoinInfo>(`/api/group-search/join-info/${accountId}`);
  return { joinedToday: info.joined_today, maxDaily: info.max_daily, remaining: info.remaining };
}

export async function fetchJoinLogs(accountId: string): Promise<GroupJoinLog[]> {
  const body = await request<{ items: ApiGroupJoinLog[] }>(`/api/group-search/join-logs/${accountId}`);
  return (body.items ?? body).map(toJoinLog);
}

