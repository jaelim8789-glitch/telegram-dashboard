import { Panel } from "@/components/ui/Panel";
import { useDashboardStore } from "@/store/useDashboardStore";

export function AutoReplyInspector() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-4">
      <Panel title="자동 응답 작동 방식" compact>
        <ul className="space-y-2 text-xs text-app-text-muted">
          <li>
            <strong className="text-app-text">켜기/끄기</strong>
            <br />위 토글로 전체 자동 응답을 활성화합니다. 꺼져 있으면 규칙이 있어도 작동하지 않습니다.
          </li>
          <li>
            <strong className="text-app-text">규칙 조건</strong>
            <br />&ldquo;키워드 포함&rdquo;은 메시지에 지정한 단어가 포함되면 응답합니다.
            &ldquo;정확히 일치&rdquo;는 메시지가 문구와 완전히 같을 때만 응답합니다.
          </li>
          <li>
            <strong className="text-app-text">쿨다운</strong>
            <br />같은 사용자에게 규칙별로 설정한 시간 안에 다시 응답하지 않습니다.
          </li>
          <li>
            <strong className="text-app-text">일일 최대 응답</strong>
            <br />규칙별로 하루 응답 횟수를 제한합니다. 초과하면 다음 날까지 응답하지 않습니다.
          </li>
        </ul>
      </Panel>

      {account && (
        <Panel title="현재 계정" compact>
          <p className="text-xs text-app-text-muted">
            <span className="text-app-text">{account.name ?? account.phone}</span>
            <br />
            {account.phone && <span className="text-[11px]">{account.phone}</span>}
          </p>
        </Panel>
      )}

      <Panel title="참고" compact>
        <p className="text-xs text-app-text-muted">
          자동 응답은 서버가 실행 중일 때만 동작합니다. 서버가 재시작되면 규칙은 유지되지만
          재시작 중에 들어온 메시지에는 응답할 수 없습니다.
        </p>
      </Panel>
    </div>
  );
}
