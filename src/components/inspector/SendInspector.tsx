"use client";

import { useEffect, useState } from "react";
import { ImageIcon, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getAccountDisplayName, getAccountInitials, type AccountStatus } from "@/types";

const ACCOUNT_STATUS_LABEL: Record<AccountStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  active: { label: "활성", tone: "success" },
  inactive: { label: "비활성", tone: "warning" },
  banned: { label: "차단됨", tone: "danger" },
};

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}

export function SendInspector() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  const message = useDashboardStore((s) => s.sendMessage);
  const imageFile = useDashboardStore((s) => s.sendImageFile);
  const groups = useDashboardStore((s) => s.sendGroups);
  const selectedIds = useDashboardStore((s) => s.sendSelectedGroupIds);

  const imagePreviewUrl = useObjectUrl(imageFile);
  const selectedGroups = groups.filter((g) => selectedIds.includes(g.id));

  return (
    <div className="space-y-4">
      <Panel title="실시간 미리보기" description="실제 Telegram 메시지 화면과 동일하게 보입니다.">
        {account ? (
          <div className="rounded-2xl bg-app-bg p-3">
            <div className="mb-1.5 text-[11px] font-medium text-app-text-muted">
              발신: {getAccountDisplayName(account)}
            </div>
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-card-hover text-xs font-semibold text-app-text">
                {getAccountInitials(account)}
              </div>
              <div className="max-w-[220px] rounded-2xl rounded-tl-sm bg-app-card px-3 py-2">
                {imagePreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreviewUrl} alt="" className="mb-1.5 max-h-40 w-full rounded-lg object-cover" />
                )}
                {message ? (
                  <p className="whitespace-pre-wrap break-words text-sm text-app-text">{message}</p>
                ) : (
                  <p className="text-sm italic text-app-text-subtle">메시지를 입력하면 여기에 표시됩니다.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-app-text-subtle">계정을 선택해주세요.</p>
        )}
      </Panel>

      <Panel title="발송 요약">
        <ul className="space-y-1.5 text-xs text-app-text-muted">
          <li>
            선택된 대상: <span className="text-app-text">{selectedGroups.length}개</span>
          </li>
          {imageFile && (
            <li className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> 이미지 첨부됨
            </li>
          )}
          {!message && selectedIds.length === 0 && (
            <li className="text-app-text-subtle">메시지를 입력하고 발송 대상을 선택하세요.</li>
          )}
          {message && selectedIds.length === 0 && (
            <li className="text-app-warning">발송 대상을 선택해주세요.</li>
          )}
          {!message && selectedIds.length > 0 && (
            <li className="text-app-warning">메시지 내용을 입력해주세요.</li>
          )}
          {message && selectedIds.length > 0 && (
            <li className="flex items-center gap-1 text-app-success">
              <span>발송 가능</span>
            </li>
          )}
        </ul>
        {selectedGroups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedGroups.map((g) => (
              <span key={g.id} className="rounded-full bg-app-card-hover px-2 py-0.5 text-[11px] text-app-text-muted">
                {g.title}
              </span>
            ))}
          </div>
        )}
      </Panel>

      {account && (
        <Panel title="통계">
          <ul className="space-y-1 text-xs text-app-text-muted">
            <li>
              오늘 발송: <span className="text-app-text">{account.todaySent}건</span>
            </li>
            <li>
              참여 그룹 수: <span className="text-app-text">{account.groupCount}개</span>
            </li>
            <li className="flex items-center gap-1.5">
              계정 상태:{" "}
              <Badge tone={ACCOUNT_STATUS_LABEL[account.status].tone}>
                {ACCOUNT_STATUS_LABEL[account.status].label}
              </Badge>
            </li>
            <li>
              전체 대상 수: <span className="text-app-text">{groups.reduce((sum, g) => sum + (g.participantsCount ?? 0), 0).toLocaleString()}명</span>
            </li>
          </ul>
        </Panel>
      )}

      <Panel title="안전 설정">
        <div className="flex items-start gap-2 text-xs text-app-text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-success" />
          <p>
            Telegram 정책 준수를 위해 서버에서 항상 강제됩니다: 계정당{" "}
            <span className="text-app-text">1분에 1회</span> 간격으로 전송됩니다.
          </p>
        </div>
      </Panel>
    </div>
  );
}
