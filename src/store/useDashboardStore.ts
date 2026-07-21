import { create } from "zustand";
import type { Account, Broadcast, Group, TabId } from "@/types";
import * as api from "@/lib/api";
import { RuntimeManager } from "@/lib/runtimeManager";

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
  const next: string[] = [];
  for (const id of ids) {
    if (validIds && !validIds.has(id)) continue;
    next.push(id);
  }
  return next;
}

type DashboardStateValue = {
  activeTab: TabId;
  role: "admin" | "user" | "api_key" | null;
  subscriptionStatus: string | null;
  plan: string | null;
  trialExpiresAt: string | null;
  accounts: Account[];
  accountsLoading: boolean;
  accountsError: string | null;
  selectedAccountId: string | null;
  sendGroups: Group[];
  sendGroupsLoading: boolean;
  sendMessage: string;
  sendImageFile: File | null;
  sendSelectedGroupIds: string[];
  sendReplyToMessageId: number | null;
  reuseNotice: string | null;
  tabBadges: Partial<Record<TabId, number>>;
};

export const INITIAL_STATE: DashboardStateValue = {
  activeTab: loadLastTab(),
  role: null,
  subscriptionStatus: null,
  plan: null,
  trialExpiresAt: null,
  accounts: [],
  accountsLoading: true,
  accountsError: null,
  selectedAccountId: null,
  sendGroups: [],
  sendGroupsLoading: false,
  sendMessage: "",
  sendImageFile: null,
  sendSelectedGroupIds: [],
  sendReplyToMessageId: null,
  reuseNotice: null,
  tabBadges: {},
};

interface DashboardState extends DashboardStateValue {
  setActiveTab: (tab: TabId) => void;
  setRole: (role: "admin" | "user" | "api_key" | null) => void;
  setSubscription: (status: string | null, plan: string | null, trialExpiresAt: string | null) => void;
  selectAccount: (id: string) => void;
  fetchAccounts: () => Promise<void>;
  registerAccount: (input: api.CreateAccountInput) => Promise<Account>;
  removeAccount: (id: string) => Promise<void>;
  setSendGroups: (groups: Group[]) => void;
  setSendGroupsLoading: (loading: boolean) => void;
  setSendMessage: (message: string) => void;
  setSendImageFile: (file: File | null) => void;
  toggleSendGroupId: (id: string) => void;
  setSendSelectedGroupIds: (ids: string[]) => void;
  clearSendRecipients: () => void;
  clearSendDraft: () => void;
  reuseBroadcast: (broadcast: Broadcast) => void;
  setReuseNotice: (notice: string | null) => void;
  setTabBadge: (tabId: TabId, count: number) => void;
  resetStore: () => void;
}

const RECENT_SETS_KEY = "telemon-recent-recipient-sets";
const LAST_TAB_KEY = "telemon-last-tab";
let runtimeManagerSubscription: (() => void) | null = null;

function loadLastTab(): TabId {
  if (typeof localStorage === "undefined") return "myai" as TabId;
  try {
    const saved = localStorage.getItem(LAST_TAB_KEY);
    if (saved) return saved as TabId;
  } catch { }
  return "myai" as TabId;
}

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
  ...INITIAL_STATE,

  resetStore: () => {
    runtimeManagerSubscription?.();
    runtimeManagerSubscription = null;
    RuntimeManager.getInstance().destroy();
    set({ ...INITIAL_STATE });
  },

  setActiveTab: (tab) => {
    try { localStorage.setItem(LAST_TAB_KEY, tab); } catch { }
    // Debounce double-tap: ignore if same tab within 300ms
    const now = Date.now();
    const lastSwitch = (window as any).__lastTabSwitch;
    if (lastSwitch && now - lastSwitch < 300 && tab === (window as any).__lastTabId) return;
    (window as any).__lastTabSwitch = now;
    (window as any).__lastTabId = tab;
    set({ activeTab: tab });
  },

  role: null,
  setRole: (role) => set({ role }),

  subscriptionStatus: null,
  plan: null,
  trialExpiresAt: null,
  setSubscription: (subscriptionStatus, plan, trialExpiresAt) => set({ subscriptionStatus, plan, trialExpiresAt }),

  accounts: [],
  accountsLoading: true,
  accountsError: null,
  selectedAccountId: null,

  /** RuntimeManager를 통해 즉시 계정 전환 — API 재호출 없음 */
  selectAccount: (id) => {
    set({ selectedAccountId: id });
    // RuntimeManager에도 동기화하여 캐시된 데이터가 준비되도록 함
    RuntimeManager.getInstance().selectAccount(id);
  },

  /** RuntimeManager를 통해 계정 목록 로드 (캐시 우선) */
  fetchAccounts: async () => {
    set({ accountsLoading: true, accountsError: null });
    try {
      const manager = RuntimeManager.getInstance();
      if (!runtimeManagerSubscription) {
        runtimeManagerSubscription = manager.subscribe(() => {
          const currentAccounts = manager.accounts;
          set({
            accounts: currentAccounts,
            selectedAccountId: manager.selectedAccountId ?? get().selectedAccountId,
          });
        });
      }
      // RuntimeManager가 초기화되어 있지 않으면 초기화
      if (!manager.accounts.length) {
        await manager.initialize();
      } else {
        // 이미 초기화됨 — 백그라운드 refresh만 트리거
        manager.refreshAll().catch(() => {});
      }

      const accounts = manager.accounts;
      set((state) => ({
        accounts,
        accountsLoading: false,
        selectedAccountId: state.selectedAccountId ?? accounts[0]?.id ?? null,
      }));

      // RuntimeManager 구독 — 최초 한 번만 등록 (중복 구독 방지)
    } catch (err) {
      set({
        accountsLoading: false,
        accountsError: err instanceof Error ? err.message : "계정 목록을 불러오지 못했습니다.",
      });
    }
  },

  registerAccount: async (input) => {
    const account = await api.createAccount(input);
    // RuntimeManager에 새 계정 반영
    const manager = RuntimeManager.getInstance();
    await manager.refreshAll();
    set((state) => ({
      accounts: manager.accounts,
      selectedAccountId: state.selectedAccountId ?? account.id,
    }));
    return account;
  },

  removeAccount: async (id) => {
    await api.deleteAccount(id);
    // RuntimeManager에서도 제거
    const manager = RuntimeManager.getInstance();
    await manager.refreshAll();
    set((state) => ({
      accounts: manager.accounts,
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
      return { sendSelectedGroupIds: [...state.sendSelectedGroupIds, id] };
    }),
  setSendSelectedGroupIds: (ids) => set({ sendSelectedGroupIds: ids }),
  clearSendRecipients: () => set({ sendSelectedGroupIds: [] }),
  clearSendDraft: () => set({ sendMessage: "", sendImageFile: null, sendSelectedGroupIds: [], sendReplyToMessageId: null, reuseNotice: null }),

  reuseNotice: null,
  setReuseNotice: (notice) => set({ reuseNotice: notice }),
  tabBadges: {},
  setTabBadge: (tabId, count) => set((state) => ({
    tabBadges: { ...state.tabBadges, [tabId]: count > 0 ? count : undefined },
  })),

  reuseBroadcast: (broadcast) => {
    set({
      sendMessage: broadcast.message,
      sendSelectedGroupIds: broadcast.recipients,
      sendImageFile: null,
      activeTab: "send",
      reuseNotice: "설정을 불러왔습니다. 내용을 확인 후 발송하세요.",
      sendReplyToMessageId: broadcast.replyToMessageId ?? null,
    });
  },
}));
