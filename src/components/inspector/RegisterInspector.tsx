import { Panel } from "@/components/ui/Panel";
import { Field, Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";

export function RegisterInspector() {
  return (
    <div className="space-y-4">
      <Panel title="등록 옵션">
        <Toggle label="프록시 사용" description="등록 시 프록시를 경유합니다" />
        <Toggle label="자동 재시도" description="인증 실패 시 자동 재시도" defaultOn />
      </Panel>
      <Panel title="세션 설정">
        <Field label="세션 유형">
          <Select defaultValue="standard">
            <option value="standard">표준</option>
            <option value="isolated">격리 세션</option>
          </Select>
        </Field>
      </Panel>
    </div>
  );
}
