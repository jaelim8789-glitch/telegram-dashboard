/**
 * useAccountCache — 모든 탭에서 RuntimeManager 캐시를 즉시 사용하기 위한 Hook.
 *
 * 계정 전환 시 API 재호출 없이 캐시된 데이터를 즉시 반환합니다.
 * 데이터가 없으면 최초 1회만 fetch하고, 이후에는 백그라운드 갱신됩니다.
 *
 * 사용법 (SendTab 예시):
 *   const { groups, broadcasts, loading } = useAccountCache(selectedAccountId);
 *   // groups와 broadcasts는 즉시 반환 (캐시 hit) 또는 빈 배열 후 백그라운드 fetch
 */

import { useCallback, useSyncExternalStore } from "react";
import type {
  Account,
  AutoReplyLog,
  AutoReplySettings,
  Broadcast,
  Group,
  ReplyMacro,
  ReplyMacroLog,
  AccountHealthItem,
} from "@/types";
import { RuntimeManager } from "@/lib/runtimeManager";

export interface AccountCacheData {
  /** 계정 기본 정보 (캐시) */
  account: Account | null;
  /** 그룹/채널 목록 (캐시) */
  groups: Group[];
  /** 브로드캐스트 내역 (캐시) */
  broadcasts: Broadcast[];
  /** 자동응답 설정 (캐시) */
  autoReply: AutoReplySettings | null;
  /** 자동응답 로그 (캐시) */
  autoReplyLogs: AutoReplyLog[];
  /** 답장매크로 목록 (캐시) */
  replyMacros: ReplyMacro[];
  /** 계정 헬스 상태 (캐시) */
  health: AccountHealthItem | null;
  /** 데이터 로딩 중 (첫 fetch 시에만 true) */
  loading: boolean;
}

/**
 * 특정 계정의 모든 캐시 데이터를 즉시 반환하는 Hook.
 *
 * 계정 전환 시:
 * 1. 캐시 hit → 즉시 데이터 반환 (API 호출 없음)
 * 2. 캐시 miss → 빈 배열 반환 + 백그라운드에서 fetch 시작
 * 3. RuntimeManager가 30초마다 폴링하여 데이터 최신 상태 유지
 */
export function useAccountCache(accountId: string | null): AccountCacheData {
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

  if (!accountId) {
    return {
      account: null,
      groups: [],
      broadcasts: [],
      autoReply: null,
      autoReplyLogs: [],
      replyMacros: [],
      health: null,
      loading: false,
    };
  }

  const cache = manager.getCache(accountId);

  return {
    account: cache?.account ?? null,
    groups: cache?.groups ?? [],
    broadcasts: cache?.broadcasts ?? [],
    autoReply: cache?.autoReply ?? null,
    autoReplyLogs: cache?.autoReplyLogs ?? [],
    replyMacros: cache?.replyMacros ?? [],
    health: cache?.health ?? null,
    loading: cache?.loading ?? false,
  };
}

/**
 * RuntimeManager를 통해 즉시 데이터를 새로고침합니다.
 * (API가 필요할 때 수동으로 호출)
 */
export function useRuntimeActions() {
  const manager = RuntimeManager.getInstance();

  return {
    refreshGroups: (accountId: string) => manager.refreshGroups(accountId),
    refreshBroadcasts: (accountId: string) => manager.refreshBroadcasts(accountId),
    refreshAutoReply: (accountId: string) => manager.refreshAutoReply(accountId),
    refreshAutoReplyLogs: (accountId: string) => manager.refreshAutoReplyLogs(accountId),
    refreshReplyMacros: (accountId: string) => manager.refreshReplyMacros(accountId),
    refreshHealth: (accountId: string) => manager.refreshHealth(accountId),
    refreshAll: () => manager.refreshAll(),
  };
}
