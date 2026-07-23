import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AccountState {
  // 각 계정별로 상태 저장
  accountStates: Record<string, {
    lastUsedTab: string;
    lastMessage: string;
    autoReplyEnabled: boolean;
    autoReplyMessage: string;
    selectedGroups: string[];
    quickTemplates: string[];
    lastUpdateTime: number;
  }>;
  
  // 현재 활성 계정 ID
  currentAccountId: string | null;
  
  // 계정 상태 업데이트
  updateAccountState: (accountId: string, stateUpdate: Partial<AccountState['accountStates'][string]>) => void;
  
  // 계정 전환
  switchAccount: (accountId: string) => void;
  
  // 현재 계정 상태 가져오기
  getCurrentAccountState: () => AccountState['accountStates'][string] | null;
  
  // 특정 계정 상태 가져오기
  getAccountState: (accountId: string) => AccountState['accountStates'][string] | null;
  
  // 계정 상태 초기화
  initializeAccountState: (accountId: string) => void;
}

const DEFAULT_ACCOUNT_STATE = {
  lastUsedTab: "dashboard",
  lastMessage: "",
  autoReplyEnabled: false,
  autoReplyMessage: "",
  selectedGroups: [],
  quickTemplates: [],
  lastUpdateTime: Date.now(),
};

export const useAccountStateStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accountStates: {},
      currentAccountId: null,
      
      updateAccountState: (accountId, stateUpdate) => set((state) => {
        const existingState = state.accountStates[accountId] || DEFAULT_ACCOUNT_STATE;
        const updatedState = {
          ...existingState,
          ...stateUpdate,
          lastUpdateTime: Date.now(),
        };
        
        return {
          accountStates: {
            ...state.accountStates,
            [accountId]: updatedState,
          },
        };
      }),
      
      switchAccount: (accountId) => set((state) => {
        // 현재 계정 상태 저장
        const updatedAccountStates = { ...state.accountStates };
        
        if (state.currentAccountId) {
          updatedAccountStates[state.currentAccountId] = {
            ...updatedAccountStates[state.currentAccountId],
            lastUpdateTime: Date.now(),
          };
        }
        
        // 새로운 계정 상태 확인 (없으면 초기화)
        if (!updatedAccountStates[accountId]) {
          updatedAccountStates[accountId] = DEFAULT_ACCOUNT_STATE;
        }
        
        return {
          accountStates: updatedAccountStates,
          currentAccountId: accountId,
        };
      }),
      
      getCurrentAccountState: () => {
        const { currentAccountId, accountStates } = get();
        return currentAccountId ? accountStates[currentAccountId] || null : null;
      },
      
      getAccountState: (accountId) => {
        const { accountStates } = get();
        return accountStates[accountId] || null;
      },
      
      initializeAccountState: (accountId) => set((state) => ({
        accountStates: {
          ...state.accountStates,
          [accountId]: DEFAULT_ACCOUNT_STATE,
        },
      })),
    }),
    {
      name: "telemon-account-state-storage",
    }
  )
);