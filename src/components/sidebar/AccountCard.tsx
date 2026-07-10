import { useState } from "react";
import { AlertTriangle, Ban, Clock, Plug, ShieldAlert, Trash2, WifiOff } from "lucide-react";
import { getAccountDisplayName, getAccountInitials, type Account, type AccountHealthState } from "@/types";
import { cn } from "@/lib/cn";

const STATUS_STYLE: Record<Account["status"], { dot: string; label: string }> = {
  active: { dot: "bg-green-400", label: "활성" },
  inactive: { dot: "bg-gray-500", label: "비활성" },
  banned: { dot: "bg-red-400", label: "차단됨" },
};

const HEALTH_ICON: Record<AccountHealthState, { icon: typeof AlertTriangle; color: string; title: string }> = {
  healthy: { icon: AlertTriangle, color: "text-green-400", title: "정상" },
  unauthorized: { icon: Plug, color: "text-yellow-400", title: "세션 만료 - 재인증 필요" },
  banned: { icon: Ban, color: "text-red-400", title: "차단됨" },
  rate_limited: { icon: Clock, color: "text-yellow-400", title: "제한 초과" },
  error: { icon: ShieldAlert, color: "text-red-400", title: "발송 오류" },
  unknown: { icon: AlertTriangle, color: "text-gray-400", title: "상태 미확인" },
  not_configured: { icon: WifiOff, color: "text-gray-500", title: "세션 없음 - 등록 필요" },
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

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    if (!window.confirm(`${getAccountDisplayName(account)} 계정을 삭제할까요?`)) return;
    setDeleting(true);
    try { await onDelete(account.id); } finally { setDeleting(false); }
  }

  const healthMeta = health && health !== "healthy" ? HEALTH_ICON[health] : null;
  const HealthIcon = healthMeta?.icon;

  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onSelect(account.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(account.id)}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
        selected
          ? "border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 shadow-sm shadow-indigo-500/5"
          : "border-transparent hover:border-white/5 hover:bg-white/[0.02]"
      )}
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all",
        selected ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm" : "bg-white/5 text-app-text-secondary"
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
        <span className={cn("hidden h-1.5 w-1.5 rounded-full sm:block", status.dot, selected && "animate-pulse")} />
        <span className="hidden text-[11px] text-app-text-muted sm:inline">{status.label}</span>
      </div>
      <button
        type="button" title="삭제" onClick={handleDelete} disabled={deleting}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-app-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
