import { useCallback, useSyncExternalStore } from "react";
import type {
  Account,
  AccountHealthItem,
  AutoReplyLog,
  AutoReplyRule,
  AutoReplySettings,
  Broadcast,
  Group,
  ReplyMacro,
  ReplyMacroLog,
} from "@/types";
import * as api from "@/lib/api";

// ─── 타입 정의 ──────────────────────────────────────────────────────

/** 각 계정별 캐시 데이터 */
export interface AccountRuntimeCache {
  accountId: string;
  account: Account | null;
  groups: Group[];
  groupsUpdatedAt: number;
  autoReply: AutoReplySettings | null;
  autoReplyUpdatedAt: number;
  replyMacros: ReplyMacro[];
  replyMacrosUpdatedAt: number;
  broadcasts: Broadcast[];
  broadcastsUpdatedAt: number;
  autoReplyLogs: AutoReplyLog[];
  replyMacroLogs: ReplyMacroLog[];
  health: AccountHealthItem | null;
  healthUpdatedAt: number;
  loading: boolean;
  lastRefreshAt: number;
}

function createEmptyCache(accountId: string): AccountRuntimeCache {
  return {
    accountId,
    account: null,
    groups: [],
    groupsUpdatedAt: 0,
    autoReply: null,
    autoReplyUpdatedAt: 0,
    replyMacros: [],
    replyMacrosUpdatedAt: 0,
    broadcasts: [],
    broadcastsUpdatedAt: 0,
    autoReplyLogs: [],
    replyMacroLogs: [],
    health: null,
    healthUpdatedAt: 0,
    loading: false,
    lastRefreshAt: 0,
  };
}

// ─── RuntimeManager ─────────────────────────────────────────────────

export class RuntimeManager {
  private static _instance: RuntimeManager;
  private _caches: Map<string, AccountRuntimeCache> = new Map();
  private _selectedAccountId: string | null = null;
  private _accounts: Account[] = [];
  private _healthItems: AccountHealthItem[] = [];
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;
  private _pollTimer: ReturnType<typeof setTimeout> | null = null;
  private _subscribers: Set<() => void> = new Set();
  private _revision = 0;

  static getInstance(): RuntimeManager {
    if (typeof window === 'undefined') {
      return new RuntimeManager();
    }
    if (!RuntimeManager._instance) {
      RuntimeManager._instance = new RuntimeManager();
    }
    return RuntimeManager._instance;
  }

  // ── 초기화 ────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this._initPromise) return this._initPromise;
    if (this._initialized) return;

    this._initialized = true;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      this._initialized = true;

      // 1. 계정 목록 로드
      await this._refreshAccounts();

      // 2. 각 계정의 데이터를 병렬로 Prefetch
      const promises = this._accounts.map((acct) => this._prefetchAccount(acct.id));
      await Promise.allSettled(promises);

      // 3. 첫 번째 계정 자동 선택
      if (this._accounts.length > 0 && !this._selectedAccountId) {
        this._selectedAccountId = this._accounts[0].id;
      }

      // 4. 백그라운드 폴링 시작 (30초 간격, recursive setTimeout)
      this._schedulePoll();

      this._notifySubscribers();
    } catch (err) {
      console.error("[RuntimeManager] initialization failed:", err);
      this._initialized = false;
      this._initPromise = null;
    }
  }

  destroy(): void {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
    this._caches.clear();
    this._accounts = [];
    this._healthItems = [];
    this._selectedAccountId = null;
    this._initialized = false;
    this._initPromise = null;
    this._subscribers.clear();
  }

  // ── 계정 관리 ─────────────────────────────────────────────────

  get accounts(): Account[] {
    return this._accounts;
  }

  get selectedAccountId(): string | null {
    return this._selectedAccountId;
  }

  selectAccount(id: string): void {
    if (this._selectedAccountId !== id) {
      this._selectedAccountId = id;
      // 즉시 해당 계정의 캐시가 없으면 prefetch
      if (!this._caches.has(id)) {
        this._prefetchAccount(id);
      }
      this._notifySubscribers();
    }
  }

  get selectedAccount(): Account | null {
    if (!this._selectedAccountId) return null;
    return this._caches.get(this._selectedAccountId)?.account ?? null;
  }

  // ── 캐시 데이터 접근 (즉시 반환) ──────────────────────────────

  getCache(accountId: string): AccountRuntimeCache | null {
    return this._caches.get(accountId) ?? null;
  }

  getSelectedCache(): AccountRuntimeCache | null {
    if (!this._selectedAccountId) return null;
    return this.getCache(this._selectedAccountId);
  }

  getGroups(accountId: string): Group[] {
    let cache = this._caches.get(accountId);
    if (!cache) {
      cache = this._getOrCreateCache(accountId);
    }
    return cache.groups;
  }

  getBroadcasts(accountId: string): Broadcast[] {
    return this._caches.get(accountId)?.broadcasts ?? [];
  }

  getAutoReply(accountId: string): AutoReplySettings | null {
    return this._caches.get(accountId)?.autoReply ?? null;
  }

  getAutoReplyLogs(accountId: string): AutoReplyLog[] {
    return this._caches.get(accountId)?.autoReplyLogs ?? [];
  }

  getReplyMacros(accountId: string): ReplyMacro[] {
    return this._caches.get(accountId)?.replyMacros ?? [];
  }

  getHealth(accountId: string): AccountHealthItem | null {
    return this._caches.get(accountId)?.health ?? null;
  }

  getAllHealth(): AccountHealthItem[] {
    return this._healthItems;
  }

  isAccountLoading(accountId: string): boolean {
    return this._caches.get(accountId)?.loading ?? false;
  }

  /** 스냅샷 키 — useSyncExternalStore가 실제 변경된 경우에만 notify하도록.
   *  문자열 비교로 불필요한 리렌더링을 방지합니다.
   */
  getSnapshotKey(accountId?: string | null): number {
    return this._revision;
  }

  // ── 구독 (React 동기화) ───────────────────────────────────────

  subscribe(callback: () => void): () => void {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }

  forceNotify(): void {
    this._notifySubscribers();
  }

  // ── 라우터: 계정별 API 호출 (캐시 미스 시) ────────────────────

  async refreshGroups(accountId: string): Promise<void> {
    await this._fetchAndCacheGroups(accountId);
    this._notifySubscribers();
  }

  async refreshBroadcasts(accountId: string): Promise<void> {
    await this._fetchAndCacheBroadcasts(accountId);
    this._notifySubscribers();
  }

  async refreshAutoReply(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      const settings = await api.fetchAutoReplySettings(accountId);
      if (cache.account) {
        cache.account.autoReplyEnabled = settings.autoReplyEnabled;
      }
      cache.autoReply = settings;
      cache.autoReplyUpdatedAt = Date.now();
    } catch {
      console.warn(`[RuntimeManager] auto-reply refresh failed for ${accountId}`);
    }
    this._notifySubscribers();
  }

  async refreshAutoReplyLogs(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      cache.autoReplyLogs = await api.fetchAutoReplyLogs(accountId);
    } catch {
      console.warn(`[RuntimeManager] auto-reply logs refresh failed for ${accountId}`);
    }
    this._notifySubscribers();
  }

  async refreshReplyMacros(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      cache.replyMacros = await api.fetchReplyMacros(accountId);
      cache.replyMacrosUpdatedAt = Date.now();
    } catch {
      console.warn(`[RuntimeManager] reply macros refresh failed for ${accountId}`);
    }
    this._notifySubscribers();
  }

  async refreshHealth(accountId: string): Promise<void> {
    await this._fetchAndCacheHealth(accountId);
    this._notifySubscribers();
  }

  async refreshAll(): Promise<void> {
    await this._refreshAccounts();
    const promises = this._accounts.map((acct) => this._prefetchAccount(acct.id));
    await Promise.allSettled(promises);
    this._notifySubscribers();
  }

  // ── Private: Prefetch & Cache ─────────────────────────────────

  private async _prefetchAccount(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    if (cache.loading) return; // 이미 prefetch 중
    cache.loading = true;

    try {
      const acct = this._accounts.find((a) => a.id === accountId);
      if (acct) cache.account = acct;

      await Promise.allSettled([
        this._fetchAndCacheGroups(accountId),
        this._fetchAndCacheBroadcasts(accountId),
        this._fetchAndCacheAutoReply(accountId),
        this._fetchAndCacheAutoReplyLogs(accountId),
        this._fetchAndCacheReplyMacros(accountId),
        this._fetchAndCacheHealth(accountId),
      ]);
    } finally {
      cache.loading = false;
      cache.lastRefreshAt = Date.now();
    }
    this._notifySubscribers();
  }

  private async _fetchAndCacheGroups(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      cache.groups = await api.fetchGroups(accountId);
      cache.groupsUpdatedAt = Date.now();
    } catch {
      console.warn(`[RuntimeManager] groups fetch failed for ${accountId}`);
    }
  }

  private async _fetchAndCacheBroadcasts(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      cache.broadcasts = await api.fetchLogs({ accountId });
      cache.broadcastsUpdatedAt = Date.now();
    } catch {
      console.warn(`[RuntimeManager] broadcasts fetch failed for ${accountId}`);
    }
  }

  private async _fetchAndCacheAutoReply(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      const settings = await api.fetchAutoReplySettings(accountId);
      if (cache.account) {
        cache.account.autoReplyEnabled = settings.autoReplyEnabled;
      }
      cache.autoReply = settings;
      cache.autoReplyUpdatedAt = Date.now();
    } catch {
      console.warn(`[RuntimeManager] auto-reply fetch failed for ${accountId}`);
    }
  }

  private async _fetchAndCacheAutoReplyLogs(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      cache.autoReplyLogs = await api.fetchAutoReplyLogs(accountId);
    } catch {
      console.warn(`[RuntimeManager] auto-reply logs fetch failed for ${accountId}`);
    }
  }

  private async _fetchAndCacheReplyMacros(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      cache.replyMacros = await api.fetchReplyMacros(accountId);
      cache.replyMacrosUpdatedAt = Date.now();
    } catch {
      console.warn(`[RuntimeManager] reply macros fetch failed for ${accountId}`);
    }
  }

  private async _fetchAndCacheHealth(accountId: string): Promise<void> {
    const cache = this._getOrCreateCache(accountId);
    try {
      const allHealth = await api.fetchAccountHealth();
      const item = allHealth.find((h) => h.accountId === accountId);
      if (item) cache.health = item;
      cache.healthUpdatedAt = Date.now();
    } catch {
      console.warn(`[RuntimeManager] health fetch failed for ${accountId}`);
    }
  }

  private async _refreshAccounts(): Promise<void> {
    try {
      const accounts = await api.fetchAccounts();
      this._accounts = accounts;

      for (const acct of accounts) {
        if (!this._caches.has(acct.id)) {
          const cache = createEmptyCache(acct.id);
          cache.account = acct;
          this._caches.set(acct.id, cache);
        } else {
          const cache = this._caches.get(acct.id)!;
          cache.account = acct;
        }
      }

      const activeIds = new Set(accounts.map((a) => a.id));
      for (const [id] of this._caches) {
        if (!activeIds.has(id)) {
          this._caches.delete(id);
        }
      }

      // Clear selected account if it was deleted
      if (this._selectedAccountId && !activeIds.has(this._selectedAccountId)) {
        this._selectedAccountId = activeIds.size > 0 ? accounts[0].id : null;
      }

      try {
        this._healthItems = await api.fetchAccountHealth();
      } catch {
        // silent
      }
    } catch (err) {
      console.warn("[RuntimeManager] accounts refresh failed:", err);
    }
  }

  // ── Polling (recursive setTimeout) ─────────────────────────────

  private _schedulePoll(): void {
    this._pollTimer = setTimeout(async () => {
      try {
        await this._backgroundPoll();
      } catch (err) {
        console.warn("[RuntimeManager] poll error:", err);
      }
      if (this._initialized) {
        this._schedulePoll();
      }
    }, 30_000);
  }

  private async _backgroundPoll(): Promise<void> {
    await this._refreshAccounts();

    if (this._selectedAccountId) {
      const cache = this._caches.get(this._selectedAccountId);
      if (cache) {
        await Promise.allSettled([
          this._fetchAndCacheBroadcasts(this._selectedAccountId).catch(() => {}),
          this._fetchAndCacheHealth(this._selectedAccountId).catch(() => {}),
          Date.now() - cache.groupsUpdatedAt > 300_000
            ? this._fetchAndCacheGroups(this._selectedAccountId).catch(() => {})
            : Promise.resolve(),
        ]);
      }

      // 다른 계정들의 헬스도 순차적으로 갱신 (한 번에 최대 3개)
      const otherAccounts = this._accounts.filter((a) => a.id !== this._selectedAccountId);
      const shuffled = otherAccounts.sort(() => Math.random() - 0.5);
      const batch = shuffled.slice(0, 3);
      await Promise.allSettled(
        batch.map((a) => this._fetchAndCacheHealth(a.id).catch(() => {}))
      );
    }

    this._notifySubscribers();
  }

  // ── Helpers ───────────────────────────────────────────────────

  private _getOrCreateCache(accountId: string): AccountRuntimeCache {
    let cache = this._caches.get(accountId);
    if (!cache) {
      cache = createEmptyCache(accountId);
      const acct = this._accounts.find((a) => a.id === accountId);
      if (acct) cache.account = acct;
      this._caches.set(accountId, cache);
    }
    return cache;
  }

  private _notifySubscribers(): void {
    this._revision += 1;
    for (const callback of this._subscribers) {
      try {
        callback();
      } catch (err) {
        console.error("[RuntimeManager] subscriber error:", err);
      }
    }
  }
}

// ─── React Hooks ────────────────────────────────────────────────────

/**
 * RuntimeManager의 상태를 React 컴포넌트에 동기화하는 Hook.
 *
 * 계정 전환 시 API 재호출 없이 캐시된 데이터를 즉시 반환합니다.
 */
export function useRuntime(): {
  manager: RuntimeManager;
  accounts: Account[];
  selectedAccountId: string | null;
  selectedAccount: Account | null;
  cache: AccountRuntimeCache | null;
  loading: boolean;
} {
  const manager = RuntimeManager.getInstance();

  const subscribe = useCallback(
    (cb: () => void) => manager.subscribe(cb),
    [manager],
  );

  const getSnapshot = useCallback(
    () => manager.getSnapshotKey(),
    [manager],
  );

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const selectedAccountId = manager.selectedAccountId;
  const cache = selectedAccountId
    ? manager.getCache(selectedAccountId)
    : null;

  return {
    manager,
    accounts: manager.accounts,
    selectedAccountId,
    selectedAccount: cache?.account ?? null,
    cache,
    loading: cache?.loading ?? false,
  };
}

/**
 * 특정 계정의 Runtime 캐시 데이터를 가져오는 Hook.
 */
export function useAccountRuntime(accountId: string | null): {
  manager: RuntimeManager;
  cache: AccountRuntimeCache | null;
  loading: boolean;
} {
  const manager = RuntimeManager.getInstance();

  const subscribe = useCallback(
    (cb: () => void) => manager.subscribe(cb),
    [manager],
  );

  const getSnapshot = useCallback(
    () => manager.getSnapshotKey(accountId),
    [manager, accountId],
  );

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const cache = accountId ? manager.getCache(accountId) : null;

  return {
    manager,
    cache,
    loading: cache?.loading ?? false,
  };
}
