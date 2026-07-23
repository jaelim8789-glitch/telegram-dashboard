/**
 * @jest-environment node
 */

import { useDashboardStore, INITIAL_STATE } from "@/store/useDashboardStore";
import { RuntimeManager } from "@/lib/runtimeManager";

jest.mock("@/lib/runtimeManager", () => {
  const mockSubscribe = jest.fn(() => () => {});
  const mockSelectAccount = jest.fn();
  const mockInitialize = jest.fn().mockResolvedValue(undefined);
  const mockRefreshAll = jest.fn().mockResolvedValue(undefined);
  const mockGetInstance = jest.fn(() => ({
    accounts: [],
    selectedAccountId: null,
    subscribe: mockSubscribe,
    selectAccount: mockSelectAccount,
    initialize: mockInitialize,
    refreshAll: mockRefreshAll,
    destroy: jest.fn(),
  }));

  return {
    RuntimeManager: {
      getInstance: mockGetInstance,
    },
  };
});

beforeEach(() => {
  useDashboardStore.setState(INITIAL_STATE, true);
});

describe("useDashboardStore", () => {
  it("initializes with default state", () => {
    const state = useDashboardStore.getState();
    expect(state.accounts).toEqual([]);
    expect(state.accountsLoading).toBe(true);
    expect(state.accountsError).toBeNull();
    expect(state.selectedAccountId).toBeNull();
    expect(state.navView).toBe("chat");
    expect(state.mobileFocusMode).toBe(false);
    expect(state.sidebarCollapsed).toBe(false);
  });

  it("selectAccount updates selectedAccountId", () => {
    useDashboardStore.getState().selectAccount("acc-123");
    const state = useDashboardStore.getState();
    expect(state.selectedAccountId).toBe("acc-123");
    expect(RuntimeManager.getInstance().selectAccount).toHaveBeenCalledWith("acc-123");
  });

  it("fetchAccounts handles error gracefully", async () => {
    const mockInstance = RuntimeManager.getInstance() as jest.Mocked<ReturnType<typeof RuntimeManager.getInstance>>;
    mockInstance.accounts = [];
    mockInstance.initialize.mockRejectedValueOnce(new Error("Network error"));

    await useDashboardStore.getState().fetchAccounts();

    const state = useDashboardStore.getState();
    expect(state.accountsLoading).toBe(false);
    expect(state.accountsError).toBe("Network error");
    expect(state.accounts).toEqual([]);
  });
});
