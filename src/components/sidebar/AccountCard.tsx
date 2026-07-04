import { useState } from "react";
import { Trash2 } from "lucide-react";
import { getAccountDisplayName, getAccountInitials, type Account } from "@/types";
import { cn } from "@/lib/cn";

const STATUS_STYLE: Record<Account["status"], { dot: string; label: string }> = {
  active: { dot: "bg-app-success", label: "활성" },
  inactive: { dot: "bg-app-text-subtle", label: "비활성" },
  banned: { dot: "bg-app-danger", label: "차단됨" },
};

interface AccountCardProps {
  account: Account;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function AccountCard({ account, selected, onSelect, onDelete }: AccountCardProps) {
  const status = STATUS_STYLE[account.status];
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    if (!window.confirm(`${getAccountDisplayName(account)} (${account.phone}) 계정을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(account.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(account.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(account.id)}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
        selected
          ? "border-app-primary/40 bg-app-primary-muted"
          : "border-transparent hover:border-app-border hover:bg-app-card-hover"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-card-hover text-xs font-semibold text-app-text">
        {getAccountInitials(account)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-app-text">{getAccountDisplayName(account)}</div>
        <div className="truncate text-xs text-app-text-subtle">{account.phone}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
        <span className="text-[11px] text-app-text-subtle">{status.label}</span>
      </div>
      <button
        type="button"
        title="계정 삭제"
        onClick={handleDelete}
        disabled={deleting}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-app-text-subtle opacity-0 transition-colors duration-150 hover:bg-app-danger-muted hover:text-app-danger group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
