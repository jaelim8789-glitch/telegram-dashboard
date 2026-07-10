"use client";

import { Panel } from "@/components/ui/Panel";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getAccountDisplayName } from "@/types";

export function ReplyMacroInspector() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-4">
      <Panel title="답장매크로 작동 방식" compact>
        <ul className="space-y-2 text-xs text-app-text-muted">
          <li>
            <strong className="text-app-text">전송 대상</strong>
            <br />지정한 채팅방 ID 목록에 메시지를 전송합니다.
          </li>
          <li>
            <strong className="text-app-text">일정 방식</strong>
            <br />&ldquo;간격&rdquo;은 설정한 시간마다 반복 전송합니다.
            &ldquo;고정 시간&rdquo;은 매일 지정한 시간에 전송합니다.
          </li>
          <li>
            <strong className="text-app-text">일일 최대 전송</strong>
            <br />하루 전송 횟수를 제한합니다. 초과하면 다음 날까지 전송하지 않습니다.
          </li>
          <li>
            <strong className="text-app-text">즉시 실행</strong>
            <br />일정과 관계없이 지금 바로 매크로를 실행할 수 있습니다.
          </li>
        </ul>
      </Panel>

      {account && (
        <Panel title="현재 계정" compact>
          <p className="text-xs text-app-text-muted">
            <span className="text-app-text">{getAccountDisplayName(account)}</span>
            <br />
            {account.phone && <span className="text-[11px]">{account.phone}</span>}
          </p>
        </Panel>
      )}

      <Panel title="자동 응답과의 차이점" compact>
        <p className="text-xs text-app-text-muted">
          답장매크로는 내가 보내는 예약 전송이고, 자동 응답은 상대방 메시지에 자동으로 답장하는
          기능입니다. 두 기능을 함께 사용할 수 있습니다.
        </p>
      </Panel>
    </div>
  );
}
