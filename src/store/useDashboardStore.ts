import { create } from "zustand";
import type { Account, TabId } from "@/types";
import * as api from "@/lib/api";

interface DashboardState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  accounts: Account[];
  accountsLoading: boolean;
  accountsError: string | null;
  selectedAccountId: string | null;
  selectAccount: (id: string) => void;

  fetchAccounts: () => Promise<void>;
  registerAccount: (input: api.CreateAccountInput) => Promise<Account>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeTab: "register",
  setActiveTab: (tab) => set({ activeTab: tab }),

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
}));
