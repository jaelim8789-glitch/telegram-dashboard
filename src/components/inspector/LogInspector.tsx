import { Panel } from "@/components/ui/Panel";
import { Field, Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";

export function LogInspector() {
  return (
    <div className="space-y-4">
      <Panel title="로그 필터">
        <Field label="로그 레벨">
          <Select defaultValue="all">
            <option value="all">전체</option>
            <option value="info">정보</option>
            <option value="warning">경고</option>
            <option value="error">오류</option>
          </Select>
        </Field>
        <Field label="기간">
          <Select defaultValue="today">
            <option value="today">오늘</option>
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
          </Select>
        </Field>
        <Toggle label="자동 새로고침" defaultOn />
      </Panel>
    </div>
  );
}
