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
  // OneClickBusiness modal state
  showBusinessModal: boolean;
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
  showBusinessModal: false,
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
  setSendProgress: (progress: { broadcastId: string; total: number; succeeded: number; failed: number; status: string } | null) => void;
  clearSendProgress: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  resetStore: () => void;
  // OneClickBusiness modal actions
  setShowBusinessModal: (show: boolean) => void;
}

const RECENT_SETS_KEY = "telemon-recent-recipient-sets";
const LAST_TAB_KEY = "telemon-last-tab";
const runtimeManagerSubscriptions: Set<() => void> = new Set();
let _subscriptionActive = false;

function getTabCategory(tabId: TabId): TabGroup {
  const tab = TABS.find((t) => t.id === tabId);
  return tab?.group ?? "dashboard";
}

function loadLastTab(): TabId {
  if (typeof localStorage === "undefined") return "myai" as TabId;
  try {
    const saved = localStorage.getItem(LAST_TAB_KEY);
    if (saved) return saved as TabId;
  } catch (e) { console.warn('Unhandled error in useDashboardStore', e) }
  return "myai" as TabId;
}

function saveRecentRecipientSets(sets: string[][]): void {
  try {
    localStorage.setItem(RECENT_SETS_KEY, JSON.stringify(sets.slice(0, 3)));
  } catch (e) { console.warn('Unhandled error in useDashboardStore', e) }
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

// ??Î©îÎ™®Î¶?Í¥ÄÎ¶??∏ÌÑ∞?òÏù¥???ïÏû•
interface TabMemoryManagement {
  activeTabs: string[];
  tabLoadTimestamps: Record<string, number>;
  maxInactiveTabs: number;
  cleanupInactiveTabs: () => void;
  registerActiveTab: (tabId: string) => void;
  unregisterActiveTab: (tabId: string) => void;
}

// ??Î©îÎ™®Î¶?Í¥ÄÎ¶?Í∏∞Îä• Ï∂îÍ?
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
    _subscriptionActive = false;
    RuntimeManager.getInstance().destroy();
    set({ ...INITIAL_STATE, navView: "chat", navCategory: null, navFeature: null });
  },

  setActiveTab: (tab) => {
    try { localStorage.setItem(LAST_TAB_KEY, tab); } catch (e) { console.warn('Unhandled error in useDashboardStore', e) }
    set({ activeTab: tab, navView: "feature", navFeature: tab, navCategory: getTabCategory(tab) });
  },

  navigateToChat: () => set({ navView: "chat", navCategory: null, navFeature: null }),
  navigateToCategory: (category) => set({ navView: "category", navCategory: category, navFeature: null }),
  navigateToFeature: (tabId) => {
    try { localStorage.setItem(LAST_TAB_KEY, tabId); } catch (e) { console.warn('Unhandled error in useDashboardStore', e) }
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

  /** RuntimeManagerÎ•??µÌï¥ Ï¶âÏãú Í≥ÑÏ†ï ?ÑÌôò ??API ?¨Ìò∏Ï∂??ÜÏùå */
  selectAccount: (id) => {
    set({ selectedAccountId: id });
    // RuntimeManager?êÎèÑ ?ôÍ∏∞?îÌïò??Ï∫êÏãú???∞Ïù¥?∞Í? Ï§ÄÎπÑÎêò?ÑÎ°ù ??
    RuntimeManager.getInstance().selectAccount(id);
  },

  /** RuntimeManagerÎ•??µÌï¥ Í≥ÑÏ†ï Î™©Î°ù Î°úÎìú (Ï∫êÏãú ?∞ÏÑ†) */
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
      if (!_subscriptionActive) {
        const unsub = manager.subscribe(notify);
        runtimeManagerSubscriptions.add(unsub);
        _subscriptionActive = true;
      }
      // RuntimeManagerÍ∞Ä Ï¥àÍ∏∞?îÎêò???àÏ? ?äÏúºÎ©?Ï¥àÍ∏∞??
      if (!manager.accounts.length) {
        await manager.initialize();
      } else {
        // ?¥Î? Ï¥àÍ∏∞?îÎê® ??Î∞±Í∑∏?ºÏö¥??refreshÎß??∏Î¶¨Í±?
        manager.refreshAll().catch((e) => {
          console.error("[useDashboardStore] Î∞±Í∑∏?ºÏö¥??refresh ?§Ìå®", e);
          set({ accountsError: "Î∞±Í∑∏?ºÏö¥??refresh???§Ìå®?àÏäµ?àÎã§" });
        });
      }

      const accounts = manager.accounts;
      set((state) => ({
        accounts,
        accountsLoading: false,
        selectedAccountId: state.selectedAccountId ?? accounts[0]?.id ?? null,
      }));

      // RuntimeManager Íµ¨ÎèÖ ??ÏµúÏ¥à ??Î≤àÎßå ?±Î°ù (Ï§ëÎ≥µ Íµ¨ÎèÖ Î∞©Ï?)
    } catch (err) {
      set({
        accountsLoading: false,
        accountsError: err instanceof Error ? err.message : "Í≥ÑÏ†ï Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??",
      });
    }
  },

  registerAccount: async (input) => {
    const account = await api.createAccount(input);
    // RuntimeManager????Í≥ÑÏ†ï Î∞òÏòÅ
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
    // RuntimeManager?êÏÑú???úÍ±∞
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
  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    try { localStorage.setItem("telemon-sidebar-collapsed", String(next)); } catch (e) { console.warn('Unhandled error in useDashboardStore', e) }
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
      reuseNotice: "?§Ï†ï??Î∂àÎü¨?îÏäµ?àÎã§. ?¥Ïö©???ïÏù∏ ??Î∞úÏÜ°?òÏÑ∏??",
      sendReplyToMessageId: broadcast.replyToMessageId ?? null,
    });
  },

  // ??Î©îÎ™®Î¶?Í¥ÄÎ¶??ÅÌÉú
  activeTabs: [],
  tabLoadTimestamps: {},
  maxInactiveTabs: 5, // ÎπÑÌôú????ÏµúÎ? Í∞úÏàò
  
  // ÎπÑÌôú?????ïÎ¶¨
  cleanupInactiveTabs: () => {
    set(state => {
      const now = Date.now();
      const newTabLoadTimestamps = { ...state.tabLoadTimestamps };
      const tabsToKeep = state.activeTabs;
      
      // ?§Îûò??ÎπÑÌôú?????úÍ±∞
      Object.keys(newTabLoadTimestamps).forEach(tabId => {
        if (!tabsToKeep.includes(tabId)) {
          const timeSinceLastLoad = now - newTabLoadTimestamps[tabId];
          // 30Î∂??¥ÏÉÅ ÎπÑÌôú???ÅÌÉú?????úÍ±∞
          if (timeSinceLastLoad > 30 * 60 * 1000) {
            delete newTabLoadTimestamps[tabId];
          }
        }
      });
      
      return { tabLoadTimestamps: newTabLoadTimestamps };
    });
  },
  
  // ?úÏÑ± ???±Î°ù
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
    
    // ?ÑÏöî ??ÎπÑÌôú?????ïÎ¶¨
    setTimeout(() => {
      get().cleanupInactiveTabs();
    }, 0);
  },
  
  // ?úÏÑ± ???¥Ï†ú
  unregisterActiveTab: (tabId: string) => {
    set(state => {
      const newActiveTabs = state.activeTabs.filter(id => id !== tabId);
      return { activeTabs: newActiveTabs };
    });
  },

  // OneClickBusiness modal actions
  showBusinessModal: false,
  setShowBusinessModal: (show: boolean) => set({ showBusinessModal: show })
}));
