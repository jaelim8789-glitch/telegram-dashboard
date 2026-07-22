import { create } from "zustand";
import type { Account, Broadcast, Group, NavView, TabGroup, TabId } from "@/types";
import { TABS } from "@/types";
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
  navView: NavView;
  navCategory: TabGroup | null;
  navFeature: TabId | null;
  mobileFocusMode: boolean;
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
  sendProgress: { broadcastId: string; total: number; succeeded: number; failed: number; status: string } | null;
  sidebarCollapsed: boolean;
};

const SIDEBAR_COLLAPSED_KEY = "telemon-sidebar-collapsed";

function loadSidebarCollapsed(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export const INITIAL_STATE: DashboardStateValue = {
  activeTab: loadLastTab(),
  navView: "chat",
  navCategory: null,
  navFeature: null,
  mobileFocusMode: false,
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
  sendProgress: null,
  sidebarCollapsed: loadSidebarCollapsed(),
};

interface DashboardState extends DashboardStateValue {
  /** Switch to a saved dashboard profile by name */
  dashboardSwitchProfile: (profileName: string) => void;
  /** Refresh the dashboard tab (used by ProfileSuggestion) */
  dashboardRefreshKey: number;
  setActiveTab: (tab: TabId) => void;
  navigateToChat: () => void;
  navigateToCategory: (category: TabGroup) => void;
  navigateToFeature: (tabId: TabId) => void;
  navigateBack: () => void;
  setMobileFocusMode: (enabled: boolean) => void;
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
  sendProgress: { broadcastId: string; total: number; succeeded: number; failed: number; status: string } | null;
  setSendProgress: (progress: { broadcastId: string; total: number; succeeded: number; failed: number; status: string } | null) => void;
  clearSendProgress: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  resetStore: () => void;
}

const RECENT_SETS_KEY = "telemon-recent-recipient-sets";
const LAST_TAB_KEY = "telemon-last-tab";
const runtimeManagerSubscriptions: Set<() => void> = new Set();

function getTabCategory(tabId: TabId): TabGroup {
  const tab = TABS.find((t) => t.id === tabId);
  return tab?.group ?? "dashboard";
}

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

// 탭 메모리 관리 인터페이스 확장
interface TabMemoryManagement {
  activeTabs: string[];
  tabLoadTimestamps: Record<string, number>;
  maxInactiveTabs: number;
  cleanupInactiveTabs: () => void;
  registerActiveTab: (tabId: string) => void;
  unregisterActiveTab: (tabId: string) => void;
}

// 탭 메모리 관리 기능 추가
export const useDashboardStore = create<DashboardState & TabMemoryManagement>((set, get) => ({
  ...INITIAL_STATE,
  dashboardRefreshKey: 0,
  dashboardSwitchProfile: (profileName: string) => {
    const current = get().dashboardRefreshKey;
    localStorage.setItem("telemon-dashboard-current-profile", profileName);
    set({ dashboardRefreshKey: current + 1 });
    get().setActiveTab("dashboard");
  },

  resetStore: () => {
    for (const unsub of runtimeManagerSubscriptions) {
      unsub();
    }
    runtimeManagerSubscriptions.clear();
    RuntimeManager.getInstance().destroy();
    set({ ...INITIAL_STATE, navView: "chat", navCategory: null, navFeature: null });
  },

  setActiveTab: (tab) => {
    try { localStorage.setItem(LAST_TAB_KEY, tab); } catch { }
    set({ activeTab: tab, navView: "feature", navFeature: tab, navCategory: getTabCategory(tab) });
  },

  navigateToChat: () => set({ navView: "chat", navCategory: null, navFeature: null }),
  navigateToCategory: (category) => set({ navView: "category", navCategory: category, navFeature: null }),
  navigateToFeature: (tabId) => {
    try { localStorage.setItem(LAST_TAB_KEY, tabId); } catch { }
    set({ navView: "feature", navFeature: tabId, activeTab: tabId, navCategory: getTabCategory(tabId) });
  },
  navigateBack: () => {
    const state = get();
    if (state.navView === "feature") {
      set({ navView: "category", navCategory: state.navFeature ? getTabCategory(state.navFeature) : state.navCategory, navFeature: null });
    } else if (state.navView === "category") {
      set({ navView: "chat", navCategory: null });
    }
  },

  setMobileFocusMode: (enabled) => set({ mobileFocusMode: enabled }),

  setRole: (role) => set({ role }),

  setSubscription: (subscriptionStatus, plan, trialExpiresAt) => set({ subscriptionStatus, plan, trialExpiresAt }),

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
      const notify = () => {
        const currentAccounts = manager.accounts;
        set({
          accounts: currentAccounts,
          selectedAccountId: manager.selectedAccountId ?? get().selectedAccountId,
        });
      };
      if (runtimeManagerSubscriptions.size === 0) {
        const unsub = manager.subscribe(notify);
        runtimeManagerSubscriptions.add(unsub);
      }
      // RuntimeManager가 초기화되어 있지 않으면 초기화
      if (!manager.accounts.length) {
        await manager.initialize();
      } else {
        // 이미 초기화됨 — 백그라운드 refresh만 트리거
        manager.refreshAll().catch((e) => console.error("[useDashboardStore] 백그라운드 refresh 실패", e));
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

  sendProgress: null,
  setSendProgress: (progress) => set({ sendProgress: progress }),
  clearSendProgress: () => set({ sendProgress: null }),
  sidebarCollapsed: loadSidebarCollapsed(),
  toggleSidebarCollapsed: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch {}
      return { sidebarCollapsed: next };
    }),

  sidebarCollapsed: (() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("telemon-sidebar-collapsed") === "true"; } catch { return false; }
  })(),
  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    try { localStorage.setItem("telemon-sidebar-collapsed", String(next)); } catch {}
  },

  reuseBroadcast: (broadcast) => {
    set({
      sendMessage: broadcast.message,
      sendSelectedGroupIds: broadcast.recipients,
      sendImageFile: null,
      activeTab: "send",
      navView: "feature",
      navFeature: "send",
      navCategory: "send",
      reuseNotice: "설정을 불러왔습니다. 내용을 확인 후 발송하세요.",
      sendReplyToMessageId: broadcast.replyToMessageId ?? null,
    });
  },

  // 탭 메모리 관리 상태
  activeTabs: [],
  tabLoadTimestamps: {},
  maxInactiveTabs: 5, // 비활성 탭 최대 개수
  
  // 비활성 탭 정리
  cleanupInactiveTabs: () => {
    set(state => {
      const now = Date.now();
      const newTabLoadTimestamps = { ...state.tabLoadTimestamps };
      const tabsToKeep = state.activeTabs;
      
      // 오래된 비활성 탭 제거
      Object.keys(newTabLoadTimestamps).forEach(tabId => {
        if (!tabsToKeep.includes(tabId)) {
          const timeSinceLastLoad = now - newTabLoadTimestamps[tabId];
          // 30분 이상 비활성 상태인 탭 제거
          if (timeSinceLastLoad > 30 * 60 * 1000) {
            delete newTabLoadTimestamps[tabId];
          }
        }
      });
      
      return { tabLoadTimestamps: newTabLoadTimestamps };
    });
  },
  
  // 활성 탭 등록
  registerActiveTab: (tabId: string) => {
    set(state => {
      const newActiveTabs = state.activeTabs.includes(tabId) 
        ? state.activeTabs 
        : [...state.activeTabs, tabId];
        
      return {
        activeTabs: newActiveTabs,
        tabLoadTimestamps: {
          ...state.tabLoadTimestamps,
          [tabId]: Date.now()
        }
      };
    });
    
    // 필요 시 비활성 탭 정리
    setTimeout(() => {
      get().cleanupInactiveTabs();
    }, 0);
  },
  
  // 활성 탭 해제
  unregisterActiveTab: (tabId: string) => {
    set(state => {
      const newActiveTabs = state.activeTabs.filter(id => id !== tabId);
      return { activeTabs: newActiveTabs };
    });
  },
}));
