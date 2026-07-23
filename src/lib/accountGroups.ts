"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AccountGroup } from "@/types";

/**
 * Account Groups — a lightweight, client-side grouping layer for accounts.
 *
 * Data is stored in localStorage under "telemon-account-groups".
 * Groups are purely presentational/organizational and do NOT touch the backend.
 *
 * Design follows the same pattern as accountLabels.ts and groupPreferences.ts.
 */

const STORAGE_KEY = "telemon-account-groups";

// ─── Internal helpers ────────────────────────────────────────────────

function loadGroupsRaw(): AccountGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AccountGroup[];
  } catch {
    return [];
  }
}

function saveGroups(groups: AccountGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch { /* silently ignore */ }
}

function generateId(): string {
  return `ag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Pure functions (no React) — usable outside components ────────────

export function getAccountGroups(): AccountGroup[] {
  return loadGroupsRaw();
}

export function getGroupsForAccount(accountId: string): AccountGroup[] {
  return loadGroupsRaw().filter((g) => g.accountIds.includes(accountId));
}

export function createGroup(name: string, description = "", color = "#6366f1"): AccountGroup {
  const now = new Date().toISOString();
  const group: AccountGroup = {
    id: generateId(),
    name: name.trim(),
    description: description.trim(),
    accountIds: [],
    color,
    createdAt: now,
    updatedAt: now,
  };
  const groups = loadGroupsRaw();
  groups.push(group);
  saveGroups(groups);
  return group;
}

export function updateGroup(
  id: string,
  changes: Partial<Pick<AccountGroup, "name" | "description" | "color">>
): AccountGroup | null {
  const groups = loadGroupsRaw();
  const idx = groups.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  groups[idx] = {
    ...groups[idx],
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  saveGroups(groups);
  return groups[idx];
}

export function deleteGroup(id: string): void {
  const groups = loadGroupsRaw().filter((g) => g.id !== id);
  saveGroups(groups);
}

export function assignAccountToGroup(accountId: string, groupId: string): void {
  const groups = loadGroupsRaw();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (!group.accountIds.includes(accountId)) {
    group.accountIds.push(accountId);
    group.updatedAt = new Date().toISOString();
    saveGroups(groups);
  }
}

export function unassignAccountFromGroup(accountId: string, groupId: string): void {
  const groups = loadGroupsRaw();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  group.accountIds = group.accountIds.filter((id) => id !== accountId);
  group.updatedAt = new Date().toISOString();
  saveGroups(groups);
}

export function toggleAccountInGroup(accountId: string, groupId: string): void {
  const groups = loadGroupsRaw();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (group.accountIds.includes(accountId)) {
    group.accountIds = group.accountIds.filter((id) => id !== accountId);
  } else {
    group.accountIds.push(accountId);
  }
  group.updatedAt = new Date().toISOString();
  saveGroups(groups);
}

/** Move an account from its current groups into only the given group IDs. */
export function setAccountGroups(accountId: string, groupIds: string[]): void {
  const groups = loadGroupsRaw();
  for (const group of groups) {
    const had = group.accountIds.includes(accountId);
    const shouldHave = groupIds.includes(group.id);
    if (had && !shouldHave) {
      group.accountIds = group.accountIds.filter((id) => id !== accountId);
    } else if (!had && shouldHave) {
      group.accountIds.push(accountId);
    }
    if (had !== shouldHave) group.updatedAt = new Date().toISOString();
  }
  saveGroups(groups);
}

// ─── React hooks ─────────────────────────────────────────────────────

let globalGroups: AccountGroup[] = [];
let listeners: (() => void)[] = [];

function subscribeToGroups(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): AccountGroup[] {
  return globalGroups;
}

function emitChange(): void {
  globalGroups = loadGroupsRaw();
  listeners.forEach((l) => l());
}

// Bootstrap on first import
emitChange();

/** Reactive hook that returns all account groups. Re-renders only when the
 *  underlying localStorage data actually changes inside the same tab. */
export function useAccountGroups(): AccountGroup[] {
  return useSyncExternalStore(subscribeToGroups, getSnapshot, getSnapshot);
}

/** Reactive hook returning groups that contain a specific account. */
export function useAccountBelongingGroups(accountId: string): AccountGroup[] {
  return useAccountGroups().filter((g) => g.accountIds.includes(accountId));
}

/** Mutation hooks that call the pure functions above, then notify subscribers. */

export function useCreateGroup(): (name: string, description?: string, color?: string) => AccountGroup {
  return useCallback((name: string, description?: string, color?: string) => {
    const g = createGroup(name, description, color);
    emitChange();
    return g;
  }, []);
}

export function useUpdateGroup(): (id: string, changes: Partial<Pick<AccountGroup, "name" | "description" | "color">>) => AccountGroup | null {
  return useCallback((id, changes) => {
    const result = updateGroup(id, changes);
    if (result) emitChange();
    return result;
  }, []);
}

export function useDeleteGroup(): (id: string) => void {
  return useCallback((id: string) => {
    deleteGroup(id);
    emitChange();
  }, []);
}

export function useSetAccountGroups(): (accountId: string, groupIds: string[]) => void {
  return useCallback((accountId, groupIds) => {
    setAccountGroups(accountId, groupIds);
    emitChange();
  }, []);
}

export function useToggleAccountInGroup(): (accountId: string, groupId: string) => void {
  return useCallback((accountId, groupId) => {
    toggleAccountInGroup(accountId, groupId);
    emitChange();
  }, []);
}

// ─── Predefined group colors ─────────────────────────────────────────

export const GROUP_COLORS = [
  { value: "#6366f1", label: "인디고" },
  { value: "#10b981", label: "그린" },
  { value: "#f59e0b", label: "엠버" },
  { value: "#ef4444", label: "레드" },
  { value: "#8b5cf6", label: "퍼플" },
  { value: "#06b6d4", label: "시안" },
  { value: "#f97316", label: "오렌지" },
  { value: "#ec4899", label: "핑크" },
] as const;
