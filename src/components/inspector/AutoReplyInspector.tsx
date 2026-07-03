import { Panel } from "@/components/ui/Panel";

export function AutoReplyInspector() {
  return (
    <div className="space-y-4">
      <Panel title="안내">
        <ul className="space-y-2 text-xs text-neutral-500">
          <li>스팸/무차별 홍보가 아닌 고객 응대용 FAQ 자동 응답 기능입니다.</li>
          <li>같은 사용자에게는 규칙별 쿨다운 시간 안에 다시 응답하지 않습니다.</li>
          <li>규칙별 일일 최대 응답 횟수를 넘으면 그날은 더 이상 응답하지 않습니다.</li>
          <li>
            실시간으로 동작하려면 서버가 계속 켜져 있어야 합니다 — 15분 유휴 시 잠드는 무료
            호스팅(Render 등)에서는 잠자는 동안 들어온 메시지에 응답하지 못합니다.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
