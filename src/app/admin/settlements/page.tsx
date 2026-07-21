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

interface SettlementAuditItem {
  id: string;
  action: string;
  actor_id: string | null;
  target_id: string | null;
  details: string;
  created_at: string;
}

async function fetchSettlementAuditLogs(): Promise<SettlementAuditItem[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
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
    "payout.approve": "지급 승인",
    "payout.reject": "지급 거절",
    "commission.mark_paid": "커미션 지급",
    "commission.cancel": "커미션 취소",
    "rate.set": "수수료율 변경",
    "distributor.suspend": "총판 정지",
    "distributor.unsuspend": "총판 복구",
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
      toast("error", "감사 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">정산 감사로그</h1>
          <p className="text-xs text-app-text-muted mt-0.5">누가 언제 얼마를 지급했는지 전체 내역을 확인합니다</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      <Panel
        accent="indigo"
        title={<div className="flex items-center gap-2"><FileText className="h-4 w-4" /> 정산 감사로그</div>}
        description="전체 지급/정지/수수료 변경 내역"
      >
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Search} title="감사로그 없음" description="아직 기록된 정산 내역이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-3 py-2 text-left">시간</th>
                  <th className="px-3 py-2 text-left">액션</th>
                  <th className="px-3 py-2 text-left">대상</th>
                  <th className="px-3 py-2 text-left">상세</th>
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
