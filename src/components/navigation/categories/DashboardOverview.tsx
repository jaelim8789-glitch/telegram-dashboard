"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard, ArrowRight, CheckCircle2, AlertTriangle, Clock, Activity, Users, RefreshCw } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { TABS, type TabId, type DeliveryOverview } from "@/types";
import * as api from "@/lib/api";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function DashboardOverview() {
  const { toast } = useToast();
  const navigateToFeature = useDashboardStore((s) => s.navigateToFeature);
  const accounts = useDashboardStore((s) => s.accounts);
  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", "7d");
      const res = await fetchWithTimeout(`${BASE_URL}/api/analytics/overview?${params}`, { headers: api.authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch { toast("error", "통계를 불러오지 못했습니다."); } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const summary = overview?.summary;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-app-text">대시보드</h2>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat icon={CheckCircle2} label="발송 성공" value={loading ? null : (summary?.successful ?? 0)} color="text-emerald-500" loading={loading} />
        <MiniStat icon={AlertTriangle} label="발송 실패" value={loading ? null : (summary?.failed ?? 0)} color="text-red-500" loading={loading} />
        <MiniStat icon={Activity} label="성공률" value={loading ? null : `${Math.round((summary?.success_rate ?? 0) * 100)}%`} color="text-blue-500" loading={loading} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-app-border/50 bg-app-card px-3 py-3 text-center">
          <Users className="h-4 w-4 mx-auto mb-1 text-app-text-muted" />
          <p className="text-lg font-bold text-app-text">{accounts.length}</p>
          <p className="text-[10px] text-app-text-muted">전체 계정</p>
        </div>
        <div className="rounded-xl border border-app-border/50 bg-app-card px-3 py-3 text-center">
          <RefreshCw className="h-4 w-4 mx-auto mb-1 text-app-text-muted" />
          <p className="text-lg font-bold text-app-text">{overview?.summary?.total_attempted ?? "-"}</p>
          <p className="text-[10px] text-app-text-muted">총 발송 시도</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigateToFeature("dashboard")}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-app-primary/30 bg-app-primary/5 px-4 py-3 text-sm font-semibold text-app-primary transition-all hover:bg-app-primary/10 active:scale-[0.98]"
      >
        <LayoutDashboard className="h-4 w-4" />
        상세 대시보드 열기
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number | null; color: string; loading: boolean }) {
  return (
    <div className={cn("rounded-xl border border-app-border/50 px-3 py-3 text-center", color.replace("text-", "bg-").replace("500", "500/5"))}>
      <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
      {loading ? (
        <Skeleton className="h-5 w-10 mx-auto rounded" />
      ) : (
        <p className={cn("text-lg font-bold", color)}>{value ?? "-"}</p>
      )}
      <p className="text-[10px] text-app-text-muted">{label}</p>
    </div>
  );
}
