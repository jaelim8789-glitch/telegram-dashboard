
interface WorkspaceStore {
  // ... existing properties ...
  // Autonomous Growth Loop 관련 상태 추가
  activeGrowthLoops: AutonomousGrowthLoop[];
  addGrowthLoop: (loop: AutonomousGrowthLoop) => void;
  updateGrowthLoop: (loopId: string, updates: Partial<AutonomousGrowthLoop>) => void;
  removeGrowthLoop: (loopId: string) => void;
  startGrowthLoop: (loopId: string) => void;
  pauseGrowthLoop: (loopId: string) => void;
  stopGrowthLoop: (loopId: string) => void;
}

const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  // ... existing state and actions ...
  
  // Autonomous Growth Loop 관련 초기 상태
  activeGrowthLoops: [],
  
  // Autonomous Growth Loop 관련 액션
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
  
  startGrowthLoop: (loopId) => {
    // API 호출을 통해 루프 시작
    fetch('/api/autonomous-growth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loopId, action: 'start' }),
    })
    .then(response => response.json())
    .then(() => {
      // 로컬 상태 업데이트
      get().updateGrowthLoop(loopId, { status: 'running', updatedAt: new Date() });
    })
    .catch(error => console.error('Failed to start growth loop:', error));
  },
  
  pauseGrowthLoop: (loopId) => {
    fetch('/api/autonomous-growth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loopId, action: 'pause' }),
    })
    .then(response => response.json())
    .then(() => {
      get().updateGrowthLoop(loopId, { status: 'paused', updatedAt: new Date() });
    })
    .catch(error => console.error('Failed to pause growth loop:', error));
  },
  
  stopGrowthLoop: (loopId) => {
    fetch('/api/autonomous-growth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loopId, action: 'stop' }),
    })
    .then(response => response.json())
    .then(() => {
      get().updateGrowthLoop(loopId, { status: 'idle', updatedAt: new Date() });
    })
    .catch(error => console.error('Failed to stop growth loop:', error));
  },
}));