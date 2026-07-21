"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, GripVertical, EyeOff, Send, CheckCircle2, Users, Timer, AlertTriangle } from "lucide-react";
import { usePinnedKpiStore } from "@/store/usePinnedKpiStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { cn } from "@/lib/cn";

interface KpiMeta {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  getValue: () => string;
  getSparkline: () => number[];
}

function useKpiMeta(): KpiMeta[] {
  const accounts = useDashboardStore((s) => s.accounts);
  const sendProgress = useDashboardStore((s) => s.sendProgress);

  return useMemo<KpiMeta[]>(() => {
    const todaySent = accounts.reduce((sum, a) => sum + a.todaySent, 0);
    const activeAccounts = accounts.filter((a) => a.status === "active").length;
    const unhealthy = accounts.filter((a) => a.status !== "active").length;

    return [
      {
        id: "todaySent",
        label: "Today Sent",
        icon: Send,
        color: "text-app-primary",
        getValue: () => todaySent.toLocaleString(),
        getSparkline: () => [12, 19, 15, 22, 18, 24, todaySent],
      },
      {
        id: "successRate",
        label: "Success Rate",
        icon: CheckCircle2,
        color: "text-app-success",
        getValue: () => {
          if (sendProgress && sendProgress.total > 0) {
            return `${Math.round((sendProgress.succeeded / sendProgress.total) * 100)}%`;
          }
          return "—";
        },
        getSparkline: () => [88, 92, 85, 91, 94, 89, 93],
      },
      {
        id: "activeAccounts",
        label: "Active Accts",
        icon: Users,
        color: "text-blue-500",
        getValue: () => `${activeAccounts}/${accounts.length}`,
        getSparkline: () => [3, 4, 4, 5, 5, activeAccounts, activeAccounts],
      },
      {
        id: "queue",
        label: "Queue",
        icon: Timer,
        color: "text-amber-500",
        getValue: () => {
          if (sendProgress && sendProgress.status === "sending") {
            return `${sendProgress.total - sendProgress.succeeded - sendProgress.failed}`;
          }
          return "0";
        },
        getSparkline: () => [5, 3, 8, 2, 0, 1, 0],
      },
      {
        id: "errors",
        label: "Errors",
        icon: AlertTriangle,
        color: "text-app-danger",
        getValue: () => {
          if (sendProgress && sendProgress.total > 0) {
            return sendProgress.failed.toString();
          }
          return "0";
        },
        getSparkline: () => [1, 0, 2, 1, 0, 0, 0],
      },
    ];
  }, [accounts, sendProgress]);
}

function SparklineBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-px h-5">
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-t-sm ${color} opacity-70`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

interface KpiCardProps {
  meta: KpiMeta;
  onLongPress?: () => void;
  editMode: boolean;
}

function KpiCard({ meta, onLongPress, editMode }: KpiCardProps) {
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  const handleTouchStart = () => {
    longPressTimer = setTimeout(() => onLongPress?.(), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };
  const handleTouchMove = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  const IconComponent = meta.icon as React.ComponentType<{ className?: string }>;

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border border-app-border/40 bg-app-card px-2.5 py-1.5 min-w-[100px] shrink-0 snap-start select-none",
        editMode && "ring-2 ring-app-primary/40",
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => { e.preventDefault(); onLongPress?.(); }}
    >
      <div className="flex items-center gap-1 w-full">
        {editMode && <GripVertical className="h-3 w-3 text-app-text-muted shrink-0" />}
        <IconComponent className={cn("h-3 w-3", meta.color)} />
        <span className="text-[10px] text-app-text-muted truncate flex-1">{meta.label}</span>
        {editMode && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onLongPress?.(); }}
            className="text-app-text-muted hover:text-app-danger transition-colors"
          >
            <EyeOff className="h-3 w-3" />
          </button>
        )}
      </div>
      <span className={cn("text-sm font-bold tabular-nums leading-tight", meta.color)}>
        {meta.getValue()}
      </span>
      <SparklineBar values={meta.getSparkline()} color={meta.color.replace("text-", "bg-")} />
    </div>
  );
}

export function PinnedKpiBar() {
  const pinnedIds = usePinnedKpiStore((s) => s.pinnedIds);
  const collapsed = usePinnedKpiStore((s) => s.collapsed);
  const toggleCollapsed = usePinnedKpiStore((s) => s.toggleCollapsed);
  const unpin = usePinnedKpiStore((s) => s.unpin);
  const haptics = useHapticFeedback();
  const allMeta = useKpiMeta();

  const pinnedMeta = useMemo(
    () => pinnedIds.map((id) => allMeta.find((m) => m.id === id)).filter(Boolean) as KpiMeta[],
    [pinnedIds, allMeta],
  );

  if (pinnedMeta.length === 0) return null;

  return (
    <div className="sticky top-[41px] z-10 border-b border-app-border/30 bg-app-surface/60 backdrop-blur-md">
      <button
        type="button"
        onClick={() => { haptics.light(); toggleCollapsed(); }}
        className="flex items-center justify-center w-full py-0.5 text-app-text-muted hover:text-app-text transition-colors"
        aria-label={collapsed ? "Expand pinned KPIs" : "Collapse pinned KPIs"}
      >
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronUp className="h-3 w-3" />
        </motion.div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex gap-2 overflow-x-auto px-2 pb-2 snap-x snap-mandatory scrollbar-hide [-webkit-overflow-scrolling:touch]"
              style={{ scrollbarWidth: "none" }}
            >
              {pinnedMeta.map((meta) => (
                <KpiCard
                  key={meta.id}
                  meta={meta}
                  editMode={false}
                  onLongPress={() => unpin(meta.id)}
                />
              ))}
              <div className="shrink-0 w-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
