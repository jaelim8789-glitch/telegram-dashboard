import { Panel } from "@/components/ui/Panel";
import { Toggle } from "@/components/ui/Toggle";

export function ProfileInspector() {
  return (
    <div className="space-y-4">
      <Panel title="표시 옵션">
        <Toggle label="전화번호 공개" />
        <Toggle label="마지막 접속 시간 표시" defaultOn />
      </Panel>
      <Panel title="변경 이력">
        <p className="text-xs text-neutral-600">최근 변경 사항이 없습니다.</p>
      </Panel>
    </div>
  );
}
