import { Panel } from "@/components/ui/Panel";
import { Field, Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";

export function GroupInspector() {
  return (
    <div className="space-y-4">
      <Panel title="정렬 및 필터">
        <Field label="정렬 기준">
          <Select defaultValue="name">
            <option value="name">이름순</option>
            <option value="members">멤버 수순</option>
            <option value="recent">최근 활동순</option>
          </Select>
        </Field>
        <Toggle label="채널만 보기" />
        <Toggle label="비활성 그룹 숨기기" defaultOn />
      </Panel>
    </div>
  );
}
