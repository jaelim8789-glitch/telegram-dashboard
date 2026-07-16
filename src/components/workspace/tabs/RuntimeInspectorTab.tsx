"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Shield,
  XCircle,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { downloadCsv } from "@/lib/exportCsv";
import * as api from "@/lib/api";
import type { RuntimeInspectorSummary, RuntimeSummaryItem } from "@/lib/api";

const HEALTH_META: Record<
  string,
  { tone: "success" | "warning" | "danger" | "neutral" | "info"; label: string; icon: typeof Activity }
> = {
  healthy: { tone: "success", label: "Healthy", icon: CheckCircle2 },
  unauthorized: { tone: "danger", label: "Session expired", icon: XCircle },
  rate_limited: { tone: "warning", label: "Rate limited", icon: AlertTriangle },
  banned: { tone: "danger", label: "Banned", icon: Shield },
  error: { tone: "danger", label: "Error", icon: AlertTriangle },
  unknown: { tone: "neutral", label: "Unknown", icon: Activity },
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function RuntimeRow({
  item,
  onRecover,
  onRestart,
  onSelect,
  recovering,
  restarting,
}: {
  item: RuntimeSummaryItem;
  onRecover: (id: string) => void;
  onRestart: (id: string) => void;
  onSelect: (id: string) => void;
  recovering: string | null;
  restarting: string | null;
}) {
  const meta = HEALTH_META[item.health_status] ?? HEALTH_META.unknown;
  const Icon = meta.icon;
  const isRecovering = recovering === item.account_id;
  const isRestarting = restarting === item.account_id;

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:bg-app-card-hover",
        item.health_status === "healthy" && "border-app-success/20",
        item.health_status === "unauthorized" && "border-app-danger/20 bg-app-danger-muted/10",
        item.health_status === "rate_limited" && "border-app-warning/20 bg-app-warning-muted/10",
        item.health_status === "error" && "border-app-danger/20 bg-app-danger-muted/10",
        !["healthy", "unauthorized", "rate_limited", "error"].includes(item.health_status) && "border-app-border",
      )}
      onClick={() => onSelect(item.account_id)}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          item.health_status === "healthy" && "bg-app-success-muted/30 text-app-success",
          item.health_status === "unauthorized" && "bg-app-danger-muted/30 text-app-danger",
          item.health_status === "rate_limited" && "bg-app-warning-muted/30 text-app-warning",
          item.health_status === "banned" && "bg-app-danger-muted/30 text-app-danger",
          item.health_status === "error" && "bg-app-danger-muted/30 text-app-danger",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-app-text">{item.name || item.phone}</span>
          <Badge tone={meta.tone} className="shrink-0 text-[10px]">
            {meta.label}
          </Badge>
          {!item.running && <Badge tone="warning">Stopped</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-app-text-subtle">
          <span className="font-mono">{item.phone}</span>
          <span>Uptime {formatUptime(item.uptime_seconds)}</span>
          <span>Today {item.today_sent}</span>
          <span>Groups {item.group_count}</span>
          {item.active_broadcasts > 0 && <Badge tone="info">Sending {item.active_broadcasts}</Badge>}
          {item.queue_size > 0 && <span>Queue {item.queue_size}</span>}
          {item.consecutive_failures >= 3 && (
            <span className="text-app-danger">Failures {item.consecutive_failures}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRecover(item.account_id);
          }}
          disabled={isRecovering || !item.has_session}
          title="Recover session"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text disabled:opacity-40"
        >
          <RotateCcw className={`h-4 w-4 ${isRecovering ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRestart(item.account_id);
          }}
          disabled={isRestarting}
          title="Restart runtime"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text disabled:opacity-40"
        >
          <Play className={`h-4 w-4 ${isRestarting ? "animate-pulse" : ""}`} />
        </button>
      </div>
    </div>
  );
}

export function RuntimeInspectorTab() {
  const [summary, setSummary] = useState<RuntimeInspectorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<api.RuntimeInspectorDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchRuntimeInspectorSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Runtime inspector failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRecover = useCallback(
    async (accountId: string) => {
      setRecovering(accountId);
      try {
        const result = await api.triggerSessionRecovery(accountId);
        toast(result.recovered ? "success" : "error", result.recovered ? "Session recovered." : "Recovery failed.");
        await load();
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Recovery request failed");
      } finally {
        setRecovering(null);
      }
    },
    [load, toast],
  );

  const handleRestart = useCallback(
    async (accountId: string) => {
      setRestarting(accountId);
      try {
        const result = await api.restartRuntime(accountId);
        toast(result.authenticated ? "success" : "warning", result.authenticated ? "Runtime restarted." : "Runtime restarted but needs authentication.");
        await load();
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Restart request failed");
      } finally {
        setRestarting(null);
      }
    },
    [load, toast],
  );

  const handleSelect = useCallback(
    async (accountId: string) => {
      try {
        const detail = await api.fetchRuntimeInspectorDetail(accountId);
        setSelectedDetail(detail);
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Failed to load runtime detail.");
      }
    },
    [toast],
  );

  const visibleRuntimes = useMemo(() => {
    const runtimes = summary?.runtimes ?? [];
    const query = searchQuery.trim().toLowerCase();
    return runtimes.filter((item) => {
      if (healthFilter !== "all" && item.health_status !== healthFilter) return false;
      if (!query) return true;
      return [item.account_id, item.phone, item.name ?? "", item.status, item.health_status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [healthFilter, searchQuery, summary?.runtimes]);

  const exportRows = useMemo(
    () =>
      visibleRuntimes.map((item) => ({
        account_id: item.account_id,
        phone: item.phone,
        name: item.name ?? "",
        status: item.status,
        running: item.running ? "yes" : "no",
        health_status: item.health_status,
        has_session: item.has_session ? "yes" : "no",
        uptime_seconds: item.uptime_seconds,
        today_sent: item.today_sent,
        group_count: item.group_count,
        active_broadcasts: item.active_broadcasts,
        queue_size: item.queue_size,
        consecutive_failures: item.consecutive_failures,
        recovery_attempts: item.recovery_attempts,
        last_recovery_result: item.last_recovery_result,
      })),
    [visibleRuntimes],
  );

  const stats = [
    { label: "Total", value: summary?.total ?? 0, color: "text-app-text" },
    { label: "Active", value: summary?.active ?? 0, color: "text-app-success" },
    { label: "Healthy", value: summary?.healthy ?? 0, color: "text-app-success" },
    { label: "Expired", value: summary?.unauthorized ?? 0, color: "text-app-danger" },
    { label: "Limited", value: summary?.rate_limited ?? 0, color: "text-app-warning" },
    { label: "Error", value: summary?.error ?? 0, color: "text-app-danger" },
  ];

  return (
    <Panel
      title={
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-app-primary" />
          Runtime Inspector
        </div>
      }
      description={summary ? `Total ${summary.total} runtimes · active ${summary.active}` : "Real-time runtime monitoring"}
      action={
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={() => downloadCsv(exportRows, "runtime-inspector.csv")} disabled={!summary || exportRows.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
        <Field label="Search" hint="Account, phone, name, status, or health">
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search runtimes" />
        </Field>
        <label className="flex flex-col gap-1 text-xs text-app-text-muted">
          Health
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary/60 focus-ring"
          >
            <option value="all">All</option>
            <option value="healthy">Healthy</option>
            <option value="unauthorized">Unauthorized</option>
            <option value="rate_limited">Rate limited</option>
            <option value="banned">Banned</option>
            <option value="error">Error</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
      </div>

      {!loading && summary && (
        <div className="mb-4 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 rounded-lg bg-app-card px-3 py-2">
              <span className="text-xs text-app-text-muted">{s.label}</span>
              <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {error && <InlineError className="mb-3">{error}</InlineError>}

      {loading && !summary && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {summary && visibleRuntimes.length > 0 && (
        <div className="space-y-2">
          {visibleRuntimes.map((item) => (
            <RuntimeRow
              key={item.account_id}
              item={item}
              onRecover={handleRecover}
              onRestart={handleRestart}
              onSelect={handleSelect}
              recovering={recovering}
              restarting={restarting}
            />
          ))}
        </div>
      )}

      {!loading && !error && summary && summary.runtimes.length > 0 && visibleRuntimes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-app-text-muted">
          <Search className="h-8 w-8" />
          <p className="text-sm">No runtimes match the current filters.</p>
        </div>
      )}

      {!loading && !error && summary && summary.runtimes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-app-text-muted">
          <Cpu className="h-8 w-8" />
          <p className="text-sm">No running runtimes.</p>
          <p className="text-xs">Registering an account will create one automatically.</p>
        </div>
      )}

      {selectedDetail && (
        <div className="mt-4 rounded-xl border border-app-border bg-app-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-app-text">
              <Database className="mr-1.5 inline h-4 w-4 text-app-primary" />
              Runtime Detail - {selectedDetail.name || selectedDetail.phone}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Account ID" value={selectedDetail.account_id} mono />
            <DetailField label="Phone" value={selectedDetail.phone} />
            <DetailField label="Status" value={selectedDetail.status} />
            <DetailField label="Uptime" value={formatUptime(selectedDetail.uptime_seconds)} />
            <DetailField label="Started" value={selectedDetail.started_at ? new Date(selectedDetail.started_at).toLocaleString("en-US") : "N/A"} />
            <DetailField label="Today sent" value={String(selectedDetail.today_sent)} />
            <DetailField label="Group cache" value={`${String(selectedDetail.group_cache?.count ?? "?")} groups`} />
            <DetailField label="Active broadcasts" value={String(selectedDetail.broadcast_queue?.active_count ?? 0)} />
            <DetailField label="Queue size" value={String(selectedDetail.broadcast_queue?.queue_size ?? 0)} />
            <DetailField label="Auto reply" value={selectedDetail.auto_reply?.enabled ? "Enabled" : "Disabled"} />
            <DetailField label="Auto reply rules" value={`${String(selectedDetail.auto_reply?.rules_count ?? 0)} rules`} />
            <DetailField
              label="Session file"
              value={selectedDetail.session?.file_exists ? `OK ${selectedDetail.session?.file_size ?? 0} bytes` : "Missing"}
            />
          </div>
          {selectedDetail.health && (
            <div className="mt-3 border-t border-app-border pt-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-text-muted">Health detail</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailField label="Failures" value={String(selectedDetail.health.consecutive_failures ?? 0)} />
                <DetailField label="Recovery attempts" value={String(selectedDetail.health.recovery_attempts ?? 0)} />
                <DetailField label="Last recovery" value={String(selectedDetail.health.last_recovery_result ?? "N/A")} />
                <DetailField
                  label="Session verified"
                  value={selectedDetail.health.session_last_verified_at ? new Date(selectedDetail.health.session_last_verified_at as string).toLocaleString("en-US") : "None"}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-app-bg/50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-app-text-subtle">{label}</p>
      <p className={cn("mt-0.5 text-sm font-medium text-app-text", mono && "font-mono")}>{value || "—"}</p>
    </div>
  );
}
