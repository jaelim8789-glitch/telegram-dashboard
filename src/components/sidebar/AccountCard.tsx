import { useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Clock, Plug, ShieldAlert, Trash2, WifiOff } from "lucide-react";
import { getAccountDisplayName, getAccountInitials, type Account, type AccountHealthState } from "@/types";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const STATUS_STYLE: Record<Account["status"], { dot: string; label: string }> = {
  active: { dot: "bg-app-success", label: "활성" },
  inactive: { dot: "bg-app-text-subtle", label: "비활성" },
  banned: { dot: "bg-app-danger", label: "차단됨" },
};

const HEALTH_ICON: Record<AccountHealthState, { icon: typeof AlertTriangle; color: string; title: string }> = {
  healthy: { icon: CheckCircle2, color: "text-app-success", title: "정상" },
  unauthorized: { icon: Plug, color: "text-app-warning", title: "세션 만료 - 재인증 필요" },
  banned: { icon: Ban, color: "text-app-danger", title: "차단됨" },
  rate_limited: { icon: Clock, color: "text-app-warning", title: "제한 초과" },
  error: { icon: ShieldAlert, color: "text-app-danger", title: "발송 오류" },
  unknown: { icon: AlertTriangle, color: "text-app-text-muted", title: "상태 미확인" },
  not_configured: { icon: WifiOff, color: "text-app-text-subtle", title: "세션 없음 - 등록 필요" },
};

interface AccountCardProps {
  account: Account;
  selected: boolean;
  health?: AccountHealthState;
  lastError?: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function AccountCard({ account, selected, health, lastError, onSelect, onDelete }: AccountCardProps) {
  const status = STATUS_STYLE[account.status];
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirmDelete() {
    setDeleting(true);
    setConfirmOpen(false);
    try { await onDelete(account.id); } finally { setDeleting(false); }
  }

  const healthMeta = health ? HEALTH_ICON[health] : null;
  const HealthIcon = healthMeta?.icon;

  return (
    <>
      <div
        role="button" tabIndex={0}
        onClick={() => onSelect(account.id)}
        onKeyDown={(e) => e.key === "Enter" && onSelect(account.id)}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
          selected
            ? "border-app-primary/30 bg-gradient-to-r from-app-primary/10 to-app-primary/5 shadow-sm shadow-app-primary/5"
            : "border-transparent hover:border-app-border hover:bg-app-card-hover"
        )}
      >
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all",
          selected ? "bg-gradient-to-br from-app-primary to-orange-600 text-white shadow-sm" : "bg-app-card-hover text-app-text-secondary"
        )}>
          {getAccountInitials(account)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-app-text">{getAccountDisplayName(account)}</div>
          <div className="truncate text-xs text-app-text-muted">{account.phone}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {healthMeta && HealthIcon && (
            <span title={lastError ? `${healthMeta.title}: ${lastError}` : healthMeta.title}>
              <HealthIcon className={cn("h-3.5 w-3.5", healthMeta.color)} />
            </span>
          )}
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot, selected && "animate-pulse")} />
          <span className="text-[11px] text-app-text-muted">{status.label}</span>
        </div>
        <button
          type="button" title="삭제" onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }} disabled={deleting}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-app-text-muted transition-all hover:bg-app-danger-muted hover:text-app-danger disabled:opacity-50",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={`${getAccountDisplayName(account)} 계정을 삭제할까요?`}
        variant="danger"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
