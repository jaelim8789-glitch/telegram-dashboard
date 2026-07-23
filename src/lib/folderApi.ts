// ─── Folder Management API ─────────────────────────────────────────

import type { GroupFolder, FolderCreateInput, FolderUpdateInput, BatchMoveInput, FolderSendInput, FolderReorderInput, SmartFolderConfig } from "@/types";
import { request } from "@/lib/api";

export async function fetchFolders(accountId: string, tree?: boolean): Promise<GroupFolder[]> {
  const params = tree ? "?tree=true" : "";
  return request<GroupFolder[]>(`/api/accounts/${accountId}/folders${params}`);
}

export async function createFolder(accountId: string, input: FolderCreateInput): Promise<GroupFolder> {
  return request<GroupFolder>(`/api/accounts/${accountId}/folders`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createSmartFolder(accountId: string, input: SmartFolderConfig): Promise<GroupFolder> {
  return request<GroupFolder>(`/api/accounts/${accountId}/folders/smart`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateFolder(accountId: string, folderId: string, input: FolderUpdateInput): Promise<GroupFolder> {
  return request<GroupFolder>(`/api/accounts/${accountId}/folders/${folderId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteFolder(accountId: string, folderId: string): Promise<void> {
  await request<void>(`/api/accounts/${accountId}/folders/${folderId}`, {
    method: "DELETE",
  });
}

export async function reorderFolders(accountId: string, input: FolderReorderInput[]): Promise<{ status: string }> {
  return request(`/api/accounts/${accountId}/folders/reorder`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function batchMoveGroups(accountId: string, input: BatchMoveInput): Promise<{ moved_count: number }> {
  return request(`/api/accounts/${accountId}/folders/batch/move`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function syncTelegramFolders(accountId: string): Promise<GroupFolder[]> {
  return request<GroupFolder[]>(`/api/accounts/${accountId}/folders/sync`, {
    method: "POST",
  });
}

export async function sendToFolders(accountId: string, input: FolderSendInput): Promise<{
  broadcast_ids: string[];
  total_groups: number;
  sent_count: number;
  message: string;
}> {
  return request(`/api/accounts/${accountId}/folders/send`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveWorkspaceState(accountId: string, state: {
  collapsed_folder_ids?: string[];
  pinned_folder_ids?: string[];
}): Promise<{ status: string }> {
  return request(`/api/accounts/${accountId}/folders/workspace-state`, {
    method: "POST",
    body: JSON.stringify(state),
  });
}