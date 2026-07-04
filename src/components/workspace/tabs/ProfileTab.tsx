import { Panel } from "@/components/ui/Panel";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getAccountDisplayName, getAccountInitials } from "@/types";

export function ProfileTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  if (!account) {
    return (
      <Panel title="프로필 편집">
        <p className="text-sm text-app-text-muted">
          먼저 &ldquo;계정 등록&rdquo; 탭에서 계정을 추가해주세요.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="프로필 편집"
      description={`선택된 계정: ${getAccountDisplayName(account)} (목업 화면 — 저장 시 동작 없음)`}
    >
      <div className="flex items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-app-card-hover text-xl font-semibold text-app-text">
            {getAccountInitials(account)}
          </div>
          <Button variant="ghost" className="text-xs">
            사진 변경
          </Button>
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="이름">
              <Input defaultValue={getAccountDisplayName(account)} />
            </Field>
            <Field label="사용자명">
              <Input placeholder="@username" />
            </Field>
          </div>
          <Field label="소개">
            <Textarea rows={3} placeholder="계정 소개를 입력하세요." />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost">취소</Button>
        <Button variant="primary">저장</Button>
      </div>
    </Panel>
  );
}
