import { useEffect, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Clock, Edit3, Plug, ShieldAlert, Star, Trash2, WifiOff, Layers, X } from "lucide-react";
import { getAccountDisplayName, getAccountInitials, type Account, type AccountHealthState } from "@/types";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getAccountLabel, setAccountLabel } from "@/lib/accountLabels";
import { useAccountBelongingGroups, useToggleAccountInGroup, useAccountGroups } from "@/lib/accountGroups";

const STATUS_STYLE: Record<Account["status"], { dot: string; label: string }> = {
  active: { dot: "bg-app-success", label: "활성" },
  inactive: { dot: "bg-app-text-subtle", label: "비활성" },
  banned: { dot: "bg-app-danger", label: "차단됨" },
  suspended: { dot: "bg-app-warning", label: "정지됨" },
};

const HEALTH_ICON: Record<AccountHealthState, { icon: typeof AlertTriangle; color: string; title: string }> = {
  healthy: { icon: CheckCircle2, color: "text-app-success", title: "정상" },
  unauthorized: { icon: Plug, color: "text-app-warning", title: "세션 만료 - 재인증 필요" },
  banned: { icon: Ban, color: "text-app-danger", title: "차단됨" },
  restricted: { icon: ShieldAlert, color: "text-app-danger", title: "그룹 발송 제한 - 텔레그램 제재 의심" },
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
  isFavorite?: boolean;
  groupFilter?: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleFavorite?: (id: string) => void;
  onClearError?: (id: string) => Promise<void>;
  onResume?: (id: string) => Promise<void>;
}

export function AccountCard({ account, selected, health, lastError, isFavorite, groupFilter, onSelect, onDelete, onToggleFavorite, onClearError, onResume }: AccountCardProps) {
  const status = STATUS_STYLE[account.status];
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [clearingError, setClearingError] = useState(false);
  const [resuming, setResuming] = useState(false);

  async function handleClearError(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onClearError || clearingError) return;
    setClearingError(true);
    try { await onClearError(account.id); }
    finally { setClearingError(false); }
  }

  async function handleResume(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onResume || resuming) return;
    setResuming(true);
    try { await onResume(account.id); }
    finally { setResuming(false); }
  }

  useEffect(() => {
    if (!groupPickerOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setGroupPickerOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [groupPickerOpen]);

  // ── Account label ──
  const [label, setLabel] = useState<string>(() => getAccountLabel(account.id) ?? "");

  // ── Account groups ──
  const belongingGroups = useAccountBelongingGroups(account.id);
  const allGroups = useAccountGroups();
  const toggleGroup = useToggleAccountInGroup();

  function handleEditLabel(e: React.MouseEvent) {
    e.stopPropagation();
    const current = getAccountLabel(account.id) ?? "";
    const newLabel = window.prompt("계정 별칭을 입력하세요 (비우면 삭제)", current);
    if (newLabel === null) return; // cancelled
    setAccountLabel(account.id, newLabel.trim());
    setLabel(newLabel.trim());
  }

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
          "group relative flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
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
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-app-text">
              {label || getAccountDisplayName(account)}
            </span>
            <button
              type="button"
              onClick={handleEditLabel}
              className="shrink-0 flex min-h-11 min-w-11 items-center justify-center rounded text-app-text-subtle opacity-0 group-hover:opacity-100 hover:text-app-primary hover:bg-app-card-hover transition-all sm:min-h-5 sm:min-w-5"
              title="별칭 편집"
            >
              <Edit3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            </button>
          </div>
          <div className="truncate text-xs text-app-text-muted">
            {label ? `${getAccountDisplayName(account)} · ${account.phone}` : account.phone}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Group indicator dot */}
          {groupFilter && (
            <span className={cn(
              "h-2 w-2 rounded-full shrink-0",
              belongingGroups.some((g) => g.id === groupFilter) ? "bg-app-primary" : "bg-app-text-subtle"
            )} />
          )}
          {healthMeta && HealthIcon && (
            <span title={lastError ? `${healthMeta.title}: ${lastError}` : healthMeta.title}>
              <HealthIcon className={cn("h-3.5 w-3.5", healthMeta.color)} />
            </span>
          )}
          {lastError && onClearError && (
            <button
              type="button"
              title="오류 확인함 (지우기)"
              onClick={handleClearError}
              disabled={clearingError}
              className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full text-app-text-subtle opacity-0 group-hover:opacity-100 hover:text-app-danger hover:bg-app-danger-muted transition-all disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot, selected && "animate-pulse")} />
          <span className="text-[11px] text-app-text-muted">{status.label}</span>
        </div>
        {/* Group assignment — visible on hover */}
        <div className="relative">
          <button
            type="button"
            title="그룹 관리"
            onClick={(e) => { e.stopPropagation(); setGroupPickerOpen(!groupPickerOpen); }}
            className={cn(
              "flex min-h-11 min-w-11 items-center justify-center rounded-md transition-all hover:bg-app-card-hover sm:min-h-[28px] sm:min-w-[28px]",
              belongingGroups.length > 0 ? "text-app-primary" : "text-app-text-subtle",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <Layers className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>
          {groupPickerOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setGroupPickerOpen(false)} />
              {/* On mobile (< 640px) use a fixed bottom sheet; on desktop use absolute dropdown */}
              <div className="fixed inset-x-4 bottom-4 z-40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-48 rounded-xl border border-app-border bg-app-surface p-1.5 shadow-xl">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-app-text-muted">그룹 지정</p>
                {allGroups.length === 0 && (
                  <p className="px-2 py-2 text-[11px] text-app-text-muted italic">그룹이 없습니다</p>
                )}
                {allGroups.map((g) => {
                  const isInGroup = belongingGroups.some((bg) => bg.id === g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleGroup(account.id, g.id); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-app-text hover:bg-app-card-hover transition-colors"
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="flex-1 text-left truncate">{g.name}</span>
                      {isInGroup && (
                        <span className="text-app-primary text-[10px] font-medium">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            title={isFavorite ? "즐겨찾기 제거" : "즐겨찾기 추가"}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(account.id); }}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md transition-all hover:bg-app-card-hover sm:min-h-6 sm:min-w-6"
          >
            <Star className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-app-text-subtle")} />
          </button>
        )}
        {account.status === "suspended" && onResume && (
          <button
            type="button"
            title="재개 (suspended → active)"
            onClick={handleResume}
            disabled={resuming}
            className={cn(
              "shrink-0 flex min-h-11 min-w-11 items-center justify-center rounded-md text-app-warning transition-all hover:bg-app-warning-muted disabled:opacity-50 sm:min-h-6 sm:min-w-6",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <RefreshCw className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", resuming && "animate-spin")} />
          </button>
        )}
        <button
          type="button" title="삭제" onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }} disabled={deleting}
          className={cn(
            "flex min-h-11 min-w-11 items-center justify-center rounded-md text-app-text-muted transition-all hover:bg-app-danger-muted hover:text-app-danger disabled:opacity-50 sm:min-h-6 sm:min-w-6",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
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