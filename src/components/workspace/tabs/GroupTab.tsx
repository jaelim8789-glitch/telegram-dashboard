"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type { Group, GroupType } from "@/types";

const TYPE_LABEL: Record<GroupType, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};

export function GroupTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(accountId: string) {
    setLoading(true);
    setError(null);
    try {
      setGroups(await api.fetchGroups(accountId));
    } catch (err) {
      setGroups([]);
      setError(err instanceof Error ? err.message : "그룹 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedAccountId) {
      load(selectedAccountId);
    } else {
      setGroups([]);
    }
  }, [selectedAccountId]);

  if (!account) {
    return (
      <Panel title="그룹 목록">
        <p className="text-sm text-neutral-500">먼저 사이드바에서 계정을 선택해주세요.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="그룹 목록"
      description={`${account.name ?? account.phone} 계정이 참여 중인 그룹/채널입니다.`}
      action={
        <Button variant="ghost" onClick={() => load(account.id)} disabled={loading}>
          새로고침
        </Button>
      }
    >
      {loading && <p className="text-xs text-neutral-500">불러오는 중...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!loading && !error && groups.length === 0 && (
        <p className="text-xs text-neutral-500">참여 중인 그룹/채널이 없습니다.</p>
      )}
      {groups.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-800/60 text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">이름</th>
                <th className="px-3 py-2 font-medium">유형</th>
                <th className="px-3 py-2 font-medium">멤버 수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {groups.map((g) => (
                <tr key={g.id}>
                  <td className="px-3 py-2.5 text-neutral-200">{g.title}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone="neutral">{TYPE_LABEL[g.type]}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-400">
                    {g.participantsCount != null ? `${g.participantsCount}명` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
