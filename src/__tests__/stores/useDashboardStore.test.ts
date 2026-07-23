import * as dashboard from "@/store/useDashboardStore";

const useDashboardStore = dashboard.useDashboardStore;
const INITIAL_STATE = dashboard.INITIAL_STATE;

jest.mock("@/lib/runtimeManager", () => {
  const mockSelectAccount = jest.fn();
  const mockInitialize = jest.fn();
  const mockRefreshAll = jest.fn();
  const mockSubscribe = jest.fn(() => jest.fn());
  const mockInstance = {
    accounts: [] as any[],
    selectedAccountId: null as string | null,
    selectAccount: mockSelectAccount,
    initialize: mockInitialize,
    refreshAll: mockRefreshAll,
    subscribe: mockSubscribe,
    destroy: jest.fn(),
  };
  const mockGetInstance = jest.fn(() => mockInstance);

  return {
    RuntimeManager: { getInstance: mockGetInstance },
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
  });

  it("selectAccount updates selectedAccountId", () => {
    const { selectAccount } = useDashboardStore.getState();
    selectAccount("acc-123");
    expect(useDashboardStore.getState().selectedAccountId).toBe("acc-123");
  });

  it("fetchAccounts handles error gracefully", async () => {
    const mod = jest.requireMock("@/lib/runtimeManager") as any;
    const instance = mod.RuntimeManager.getInstance();
    instance.accounts = [];
    instance.initialize.mockRejectedValueOnce(new Error("Network error"));

    await useDashboardStore.getState().fetchAccounts();

    const state = useDashboardStore.getState();
    expect(state.accountsLoading).toBe(false);
    expect(state.accountsError).toBe("Network error");
    expect(state.accounts).toEqual([]);
  });
});
