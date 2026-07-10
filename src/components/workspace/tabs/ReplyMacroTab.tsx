"use client";

import { Panel } from "@/components/ui/Panel";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getAccountDisplayName } from "@/types";

export function ReplyMacroTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  return (
    <Panel
      title="답장매크로"
      description={account ? `선택 계정: ${getAccountDisplayName(account)}` : "먼저 사이드바에서 계정을 선택하세요"}
    >
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-app-text-muted">
          {account
            ? "답장매크로 설정은 우측 인스펙터 패널에서 관리할 수 있습니다."
            : "계정을 선택한 후 우측 인스펙터 패널에서 답장매크로를 관리하세요."}
        </p>
      </div>
    </Panel>
  );
}
