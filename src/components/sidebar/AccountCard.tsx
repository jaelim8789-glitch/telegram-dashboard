import { getAccountDisplayName, getAccountInitials, type Account } from "@/types";
import { cn } from "@/lib/cn";

const STATUS_STYLE: Record<Account["status"], { dot: string; label: string }> = {
  active: { dot: "bg-emerald-400", label: "활성" },
  inactive: { dot: "bg-neutral-600", label: "비활성" },
  banned: { dot: "bg-red-500", label: "차단됨" },
};

interface AccountCardProps {
  account: Account;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function AccountCard({ account, selected, onSelect }: AccountCardProps) {
  const status = STATUS_STYLE[account.status];

  return (
    <button
      type="button"
      onClick={() => onSelect(account.id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-sky-500/40 bg-sky-500/10"
          : "border-transparent hover:bg-neutral-800/60"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold text-neutral-200">
        {getAccountInitials(account)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-neutral-100">
          {getAccountDisplayName(account)}
        </div>
        <div className="truncate text-xs text-neutral-500">{account.phone}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
        <span className="text-[11px] text-neutral-500">{status.label}</span>
      </div>
    </button>
  );
}
