import { request } from "@/lib/api";

// ============================================================
// Smart Join Queue API
// ============================================================

export type JoinQueueItemStatus = "queued" | "processing" | "success" | "failed" | "flood_wait";

export interface JoinQueueItem {
  id: string;
  accountId: string;
  rawLink: string;
  title: string | null;
  chatType: string | null;
  username: string | null;
  chatId: string | null;
  status: JoinQueueItemStatus;
  errorMessage: string | null;
  floodWaitUntil: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

export interface JoinQueueItemInput {
  rawLink: string;
  title?: string;
  chatType?: string | null;
  username?: string | null;
  chatId?: string | null;
}

export interface JoinQueueConfig {
  accountId: string;
  isPaused: boolean;
  joinsPerHour: number;
  maxDailyJoins: number;
  createdAt: string;
  updatedAt: string;
}

export interface JoinQueueConfigInput {
  isPaused?: boolean;
  joinsPerHour?: number;
  maxDailyJoins?: number;
}

export interface JoinQueueStats {
  accountId: string;
  totalQueued: number;
  totalProcessing: number;
  totalSuccess: number;
  totalFailed: number;
  totalFloodWait: number;
  joinedToday: number;
  maxDailyJoins: number;
  isPaused: boolean;
  joinsPerHour: number;
}

export interface PaginatedJoinQueueItems {
  items: JoinQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ApiQueueItem {
  id: string;
  account_id: string;
  raw_link: string;
  title: string | null;
  chat_type: string | null;
  username: string | null;
  chat_id: string | null;
  status: JoinQueueItemStatus;
  error_message: string | null;
  flood_wait_until: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

interface ApiQueueConfig {
  account_id: string;
  is_paused: boolean;
  joins_per_hour: number;
  max_daily_joins: number;
  created_at: string;
  updated_at: string;
}

interface ApiQueueStats {
  account_id: string;
  total_queued: number;
  total_processing: number;
  total_success: number;
  total_failed: number;
  total_flood_wait: number;
  joined_today: number;
  max_daily_joins: number;
  is_paused: boolean;
  joins_per_hour: number;
}

interface ApiPaginatedQueueItems {
  items: ApiQueueItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function toQueueItem(api: ApiQueueItem): JoinQueueItem {
  return {
    id: api.id,
    accountId: api.account_id,
    rawLink: api.raw_link,
    title: api.title,
    chatType: api.chat_type,
    username: api.username,
    chatId: api.chat_id,
    status: api.status,
    errorMessage: api.error_message,
    floodWaitUntil: api.flood_wait_until,
    position: api.position,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    processedAt: api.processed_at,
  };
}

function toQueueConfig(api: ApiQueueConfig): JoinQueueConfig {
  return {
    accountId: api.account_id,
    isPaused: api.is_paused,
    joinsPerHour: api.joins_per_hour,
    maxDailyJoins: api.max_daily_joins,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function toQueueStats(api: ApiQueueStats): JoinQueueStats {
  return {
    accountId: api.account_id,
    totalQueued: api.total_queued,
    totalProcessing: api.total_processing,
    totalSuccess: api.total_success,
    totalFailed: api.total_failed,
    totalFloodWait: api.total_flood_wait,
    joinedToday: api.joined_today,
    maxDailyJoins: api.max_daily_joins,
    isPaused: api.is_paused,
    joinsPerHour: api.joins_per_hour,
  };
}

export async function addToJoinQueue(
  accountId: string,
  items: JoinQueueItemInput[]
): Promise<{ items: JoinQueueItem[]; totalAdded: number }> {
  const body = await request<{ items: ApiQueueItem[]; total_added: number }>("/api/join-queue/add", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      items: items.map((i) => ({
        raw_link: i.rawLink,
        title: i.title ?? "",
        chat_type: i.chatType ?? null,
        username: i.username ?? null,
        chat_id: i.chatId ?? null,
      })),
    }),
  });
  return { items: body.items.map(toQueueItem), totalAdded: body.total_added };
}

export async function fetchJoinQueue(
  accountId: string,
  opts?: { status?: JoinQueueItemStatus; page?: number; pageSize?: number }
): Promise<PaginatedJoinQueueItems> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  params.set("page", String(opts?.page ?? 1));
  params.set("page_size", String(opts?.pageSize ?? 200));
  const body = await request<ApiPaginatedQueueItems>(`/api/join-queue/${accountId}?${params.toString()}`);
  return {
    items: body.items.map(toQueueItem),
    total: body.total,
    page: body.page,
    pageSize: body.page_size,
    totalPages: body.total_pages,
  };
}

export async function removeJoinQueueItems(accountId: string, itemIds: string[]): Promise<number> {
  const body = await request<{ removed_count: number }>(`/api/join-queue/${accountId}/items`, {
    method: "DELETE",
    body: JSON.stringify({ item_ids: itemIds }),
  });
  return body.removed_count;
}

export async function clearJoinQueue(accountId: string, status?: JoinQueueItemStatus): Promise<number> {
  const body = await request<{ cleared_count: number }>(`/api/join-queue/${accountId}/clear`, {
    method: "POST",
    body: JSON.stringify({ account_id: accountId, status: status ?? null }),
  });
  return body.cleared_count;
}

export async function fetchJoinQueueConfig(accountId: string): Promise<JoinQueueConfig> {
  const config = await request<ApiQueueConfig>(`/api/join-queue/${accountId}/config`);
  return toQueueConfig(config);
}

export async function updateJoinQueueConfig(
  accountId: string,
  input: JoinQueueConfigInput
): Promise<JoinQueueConfig> {
  const body: Record<string, unknown> = {};
  if (input.isPaused !== undefined) body.is_paused = input.isPaused;
  if (input.joinsPerHour !== undefined) body.joins_per_hour = input.joinsPerHour;
  if (input.maxDailyJoins !== undefined) body.max_daily_joins = input.maxDailyJoins;

  const config = await request<ApiQueueConfig>(`/api/join-queue/${accountId}/config`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return toQueueConfig(config);
}

export async function fetchJoinQueueStats(accountId: string): Promise<JoinQueueStats> {
  const stats = await request<ApiQueueStats>(`/api/join-queue/${accountId}/stats`);
  return toQueueStats(stats);
}
