"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, FileText, DollarSign, TrendingUp, Ban } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/formatTime";
import { getToken } from "@/lib/auth";

interface SettlementAuditItem {
  id: string;
  action: string;
  actor_id: string | null;
  target_id: string | null;
  details: string;
  created_at: string;
}

async function fetchSettlementAuditLogs(): Promise<SettlementAuditItem[]> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/audit/settlements`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.items || [];
}

const ACTION_TONE: Record<string, "info" | "success" | "warning" | "danger"> = {
  "payout.approve": "success",
  "payout.reject": "danger",
  "commission.mark_paid": "success",
  "commission.cancel": "danger",
  "rate.set": "warning",
  "distributor.suspend": "danger",
  "distributor.unsuspend": "info",
};

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    "payout.approve": "ì§€ê¸??¹ì¸",
    "payout.reject": "ì§€ê¸?ê±°ì ˆ",
    "commission.mark_paid": "ì»¤ë???ì§€ê¸?,
    "commission.cancel": "ì»¤ë???ì·¨ì†Œ",
    "rate.set": "?˜ìˆ˜ë£Œìœ¨ ë³€ê²?,
    "distributor.suspend": "ì´íŒ ?•ì?",
    "distributor.unsuspend": "ì´íŒ ë³µêµ¬",
  };
  return labels[action] ?? action;
}

export default function SettlementsPage() {
  return (
    <AdminGuard requireAdmin>
      <SettlementsContent />
    </AdminGuard>
  );
}

function SettlementsContent() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SettlementAuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchSettlementAuditLogs();
      setLogs(items);
    } catch {
      toast("error", "ê°ì‚¬ ë¡œê·¸ë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">?•ì‚° ê°ì‚¬ë¡œê·¸</h1>
          <p className="text-xs text-app-text-muted mt-0.5">?„ê? ?¸ì œ ?¼ë§ˆë¥?ì§€ê¸‰í–ˆ?”ì? ?„ì²´ ?´ì—­???•ì¸?©ë‹ˆ??/p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          ?ˆë¡œê³ ì¹¨
        </Button>
      </div>

      <Panel
        accent="indigo"
        title={<div className="flex items-center gap-2"><FileText className="h-4 w-4" /> ?•ì‚° ê°ì‚¬ë¡œê·¸</div>}
        description="?„ì²´ ì§€ê¸??•ì?/?˜ìˆ˜ë£?ë³€ê²??´ì—­"
      >
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map((i) => <Skeleton key={`sett-sk-${i}`} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Search} title="ê°ì‚¬ë¡œê·¸ ?†ìŒ" description="?„ì§ ê¸°ë¡???•ì‚° ?´ì—­???†ìŠµ?ˆë‹¤." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-3 py-2 text-left">?œê°„</th>
                  <th className="px-3 py-2 text-left">?¡ì…˜</th>
                  <th className="px-3 py-2 text-left">?€??/th>
                  <th className="px-3 py-2 text-left">?ì„¸</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-app-card-hover/30 transition-colors">
                    <td className="px-3 py-2 text-app-text-muted whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={ACTION_TONE[log.action] ?? "info"} className="whitespace-nowrap">
                        {actionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-app-text-muted">{log.target_id ?? log.actor_id ?? "-"}</td>
                    <td className="px-3 py-2 text-app-text-muted max-w-xs truncate">{log.details || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
