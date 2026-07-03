import { Panel } from "@/components/ui/Panel";
import { Field, Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";

export function SendInspector() {
  return (
    <div className="space-y-4">
      <Panel title="안전 옵션" description="약관 위반 방지를 위한 발송 제한 설정">
        <Toggle
          label="안전 모드"
          description="Telegram 정책 준수를 위해 발송 속도를 제한합니다"
          defaultOn
        />
        <Field label="최대 발송 수 / 시간">
          <Select defaultValue="20">
            <option value="10">10건</option>
            <option value="20">20건</option>
            <option value="50">50건</option>
          </Select>
        </Field>
      </Panel>
      <Panel title="발송 대상 요약">
        <ul className="space-y-1 text-xs text-neutral-500">
          <li>선택된 그룹: 없음</li>
          <li>예상 수신자: 0명</li>
        </ul>
      </Panel>
    </div>
  );
}
