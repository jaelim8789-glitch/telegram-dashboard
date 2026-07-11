import { create } from "zustand";
import type { Account, Broadcast, Group, TabId } from "@/types";
import * as api from "@/lib/api";
import { MAX_BROADCAST_RECIPIENTS } from "@/types";

function dedupeGroups(groups: Group[]): Group[] {
  const seen = new Set<string>();
  const next: Group[] = [];
  for (const group of groups) {
    if (seen.has(group.id)) continue;
    seen.add(group.id);
    next.push(group);
  }
  return next;
}

function dedupeRecipientIds(ids: string[], validIds?: Set<string>): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    if (validIds && !validIds.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

interface DashboardState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  role: "admin" | "user" | "api_key" | null;
  setRole: (role: "admin" | "user" | "api_key" | null) => void;

  accounts: Account[];
  accountsLoading: boolean;
  accountsError: string | null;
  selectedAccountId: string | null;
  selectAccount: (id: string) => void;

  fetchAccounts: () => Promise<void>;
  registerAccount: (input: api.CreateAccountInput) => Promise<Account>;
  removeAccount: (id: string) => Promise<void>;

  sendGroups: Group[];
  sendGroupsLoading: boolean;
  setSendGroups: (groups: Group[]) => void;
  setSendGroupsLoading: (loading: boolean) => void;

  sendMessage: string;
  setSendMessage: (message: string) => void;

  sendImageFile: File | null;
  setSendImageFile: (file: File | null) => void;

  sendSelectedGroupIds: string[];
  toggleSendGroupId: (id: string) => void;
  setSendSelectedGroupIds: (ids: string[]) => void;
  clearSendRecipients: () => void;
  clearSendDraft: () => void;
  reuseBroadcast: (broadcast: Broadcast) => void;
  reuseNotice: string | null;
  setReuseNotice: (notice: string | null) => void;
}

const RECENT_SETS_KEY = "telemon-recent-recipient-sets";

function saveRecentRecipientSets(sets: string[][]): void {
  try {
    localStorage.setItem(RECENT_SETS_KEY, JSON.stringify(sets.slice(0, 3)));
  } catch { }
}

function loadRecentRecipientSets(): string[][] {
  try {
    const raw = localStorage.getItem(RECENT_SETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: unknown) => Array.isArray(s) ? s.filter((x: unknown) => typeof x === "string") : []);
  } catch {
    return [];
  }
}

export function addRecentRecipientSet(ids: string[]): void {
  const existing = loadRecentRecipientSets();
  const deduped = existing.filter((set) => JSON.stringify(set) !== JSON.stringify(ids));
  saveRecentRecipientSets([ids, ...deduped]);
}

export function getRecentRecipientSets(): string[][] {
  return loadRecentRecipientSets();
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),

  role: null,
  setRole: (role) => set({ role }),

  accounts: [],
  accountsLoading: false,
  accountsError: null,
  selectedAccountId: null,
  selectAccount: (id) => set({ selectedAccountId: id }),

  fetchAccounts: async () => {
    set({ accountsLoading: true, accountsError: null });
    try {
      const accounts = await api.fetchAccounts();
      set((state) => ({
        accounts,
        accountsLoading: false,
        selectedAccountId: state.selectedAccountId ?? accounts[0]?.id ?? null,
      }));
    } catch (err) {
      set({
        accountsLoading: false,
        accountsError: err instanceof Error ? err.message : "계정 목록을 불러오지 못했습니다.",
      });
    }
  },

  registerAccount: async (input) => {
    const account = await api.createAccount(input);
    await get().fetchAccounts();
    return account;
  },

  removeAccount: async (id) => {
    await api.deleteAccount(id);
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
      selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
    }));
  },

  sendGroups: [],
  sendGroupsLoading: false,
  setSendGroups: (groups) =>
    set((state) => {
      const nextGroups = dedupeGroups(groups);
      const validIds = new Set(nextGroups.map((g) => g.id));
      return {
        sendGroups: nextGroups,
        sendSelectedGroupIds: dedupeRecipientIds(state.sendSelectedGroupIds, validIds),
      };
    }),
  setSendGroupsLoading: (loading) => set({ sendGroupsLoading: loading }),

  sendMessage: "",
  setSendMessage: (message) => set({ sendMessage: message }),

  sendImageFile: null,
  setSendImageFile: (file) => set({ sendImageFile: file }),

  sendSelectedGroupIds: [],
  toggleSendGroupId: (id) =>
    set((state) => {
      if (state.sendGroups.length > 0 && !state.sendGroups.some((g) => g.id === id)) return state;
      if (state.sendSelectedGroupIds.includes(id)) {
        return { sendSelectedGroupIds: state.sendSelectedGroupIds.filter((x) => x !== id) };
      }
      if (state.sendSelectedGroupIds.length >= MAX_BROADCAST_RECIPIENTS) return state;
      return { sendSelectedGroupIds: [...state.sendSelectedGroupIds, id] };
    }),
  setSendSelectedGroupIds: (ids) => set({ sendSelectedGroupIds: ids }),
  clearSendRecipients: () => set({ sendSelectedGroupIds: [] }),
  clearSendDraft: () => set({ sendMessage: "", sendImageFile: null, sendSelectedGroupIds: [], reuseNotice: null }),

  reuseNotice: null,
  setReuseNotice: (notice) => set({ reuseNotice: notice }),

  reuseBroadcast: (broadcast) => {
    set({
      sendMessage: broadcast.message,
      sendSelectedGroupIds: broadcast.recipients,
      sendImageFile: null,
      activeTab: "send",
      reuseNotice: "설정을 불러왔습니다. 내용을 확인 후 발송하세요.",
    });
  },
}));
