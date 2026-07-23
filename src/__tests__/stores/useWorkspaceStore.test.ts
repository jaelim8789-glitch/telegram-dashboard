/**
 * @jest-environment node
 */

import { useStore } from "@/store/useWorkspaceStore";

beforeEach(() => {
  useStore.setState({
    user: null,
    activeGrowthLoops: [],
    growthLoopLoading: false,
    growthLoopError: null,
  }, true);
});

describe("useWorkspaceStore", () => {
  it("initializes with correct default state", () => {
    const state = useStore.getState();
    expect(state.user).toBeNull();
    expect(state.activeGrowthLoops).toEqual([]);
    expect(state.growthLoopLoading).toBe(false);
    expect(state.growthLoopError).toBeNull();
  });

  it("addGrowthLoop adds a loop to activeGrowthLoops", () => {
    const loop = { id: "loop-1", name: "Test Loop", status: "idle" } as any;
    useStore.getState().addGrowthLoop(loop);
    expect(useStore.getState().activeGrowthLoops).toHaveLength(1);
    expect(useStore.getState().activeGrowthLoops[0].id).toBe("loop-1");
  });

  it("removeGrowthLoop removes a loop by id", () => {
    const loop1 = { id: "loop-1", name: "Loop 1" } as any;
    const loop2 = { id: "loop-2", name: "Loop 2" } as any;
    useStore.getState().addGrowthLoop(loop1);
    useStore.getState().addGrowthLoop(loop2);
    useStore.getState().removeGrowthLoop("loop-1");
    expect(useStore.getState().activeGrowthLoops).toHaveLength(1);
    expect(useStore.getState().activeGrowthLoops[0].id).toBe("loop-2");
  });
});
