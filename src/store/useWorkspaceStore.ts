import { create } from "zustand";
import type { AutonomousGrowthLoop } from "@/types/autonomous-growth";

interface WorkspaceStore {
  user: { id: string; phone: string } | null;
  activeGrowthLoops: AutonomousGrowthLoop[];
  growthLoopLoading: boolean;
  growthLoopError: string | null;
  addGrowthLoop: (loop: AutonomousGrowthLoop) => void;
  updateGrowthLoop: (loopId: string, updates: Partial<AutonomousGrowthLoop>) => void;
  removeGrowthLoop: (loopId: string) => void;
  startGrowthLoop: (loopId: string) => void;
  pauseGrowthLoop: (loopId: string) => void;
  stopGrowthLoop: (loopId: string) => void;
  clearGrowthLoopError: () => void;
}

export const useStore = create<WorkspaceStore>((set, get) => ({
  user: null,
  activeGrowthLoops: [],
  growthLoopLoading: false,
  growthLoopError: null,

  addGrowthLoop: (loop) => set((state) => ({
    activeGrowthLoops: [...state.activeGrowthLoops, loop]
  })),

  updateGrowthLoop: (loopId, updates) => set((state) => ({
    activeGrowthLoops: state.activeGrowthLoops.map(loop =>
      loop.id === loopId ? { ...loop, ...updates } : loop
    )
  })),

  removeGrowthLoop: (loopId) => set((state) => ({
    activeGrowthLoops: state.activeGrowthLoops.filter(loop => loop.id !== loopId)
  })),

  clearGrowthLoopError: () => set({ growthLoopError: null }),

  startGrowthLoop: (loopId) => {
    set({ growthLoopLoading: true, growthLoopError: null });
    fetch('/api/autonomous-growth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loopId, action: 'start' }),
    })
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then(() => {
      get().updateGrowthLoop(loopId, { status: 'running', updatedAt: new Date() });
      set({ growthLoopLoading: false });
    })
    .catch((error) => {
      console.error('Failed to start growth loop:', error);
      get().updateGrowthLoop(loopId, { status: 'idle', updatedAt: new Date() });
      set({ growthLoopLoading: false, growthLoopError: error.message || '시작 실패' });
    });
  },

  pauseGrowthLoop: (loopId) => {
    set({ growthLoopLoading: true, growthLoopError: null });
    fetch('/api/autonomous-growth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loopId, action: 'pause' }),
    })
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then(() => {
      get().updateGrowthLoop(loopId, { status: 'paused', updatedAt: new Date() });
      set({ growthLoopLoading: false });
    })
    .catch((error) => {
      console.error('Failed to pause growth loop:', error);
      get().updateGrowthLoop(loopId, { status: 'running', updatedAt: new Date() });
      set({ growthLoopLoading: false, growthLoopError: error.message || '일시정지 실패' });
    });
  },

  stopGrowthLoop: (loopId) => {
    set({ growthLoopLoading: true, growthLoopError: null });
    fetch('/api/autonomous-growth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loopId, action: 'stop' }),
    })
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then(() => {
      get().updateGrowthLoop(loopId, { status: 'idle', updatedAt: new Date() });
      set({ growthLoopLoading: false });
    })
    .catch((error) => {
      console.error('Failed to stop growth loop:', error);
      get().updateGrowthLoop(loopId, { status: 'running', updatedAt: new Date() });
      set({ growthLoopLoading: false, growthLoopError: error.message || '중지 실패' });
    });
  },
}));
