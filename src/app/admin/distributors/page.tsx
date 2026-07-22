"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, Shield, Ban, CheckCircle2, XCircle, RefreshCw, Search, Download } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import { formatDateTime } from "@/lib/formatTime";

interface Distributor {
  tenant_id: string;
  phone: string;
  plan: string;
  referral_code: string;
  referral_count: number;
  total_revenue: number;
  total_commission: number;
  total_payout: number;
  commission_rate_override: number | null;
  status: string;
  created_at: string | null;
}

async function fetchDistributors(): Promise<{ items: Distributor[]; total_count: number }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/distributors`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function setDistributorRate(tenantId: string, rate: number): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/distributors/${tenantId}/rate`, {
    method: "POST", headers, body: JSON.stringify({ rate }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function suspendDistributor(tenantId: string, reason: string, suspended: boolean): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/distributors/${tenantId}/suspend`, {
    method: "POST", headers, body: JSON.stringify({ reason, suspended }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function fetchPendingPayouts(): Promise<{ items: any[]; total_count: number }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/payouts/pending`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function approvePayout(payoutId: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/payouts/${payoutId}/approve`, { method: "POST", headers });
  if (!res.ok) throw new Error(await res.text());
}

async function rejectPayout(payoutId: string, reason: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/payouts/${payoutId}/reject`, {
    method: "POST", headers, body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function batchProcessPayouts(): Promise<{ payouts_created: number; total_amount: number; message: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("telemon-token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/referral/admin/process-payouts`, { method: "POST", headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function DistributorsPage() {
  return (
    <AdminGuard requireAdmin>
      <DistributorsContent />
    </AdminGuard>
  );
}

function DistributorsContent() {
  const { toast } = useToast();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rateEdits, setRateEdits] = useState<Record<string, string>>({});
  const [savingRate, setSavingRate] = useState<Record<string, boolean>>({});
  const [suspendReason, setSuspendReason] = useState<Record<string, string>>({});
  const [suspending, setSuspending] = useState<Record<string, boolean>>({});
  
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const [sortBy, setSortBy] = useState<SortKey>(null);
  const [memos, setMemosState] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("distributor-memos") ?? "{}"); } catch { return {}; }
  });
  function setMemos(next: Record<string, string>) {
    setMemosState(next);
    try { localStorage.setItem("distributor-memos", JSON.stringify(next)); } catch {}
  }
  const [dateRange, setDateRange] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dResult, pResult] = await Promise.all([
        fetchDistributors(),
        fetchPendingPayouts(),
      ]);
      setDistributors(dResult.items);
      setPendingPayouts(pResult.items);
    } catch (err) {
      toast("error", "총판 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const totalDistributors = distributors.length;
  const totalReferrals = distributors.reduce((s, d) => s + d.referral_count, 0);
  const totalCommission = distributors.reduce((s, d) => s + d.total_commission, 0);
  const totalPayout = distributors.reduce((s, d) => s + d.total_payout, 0);
  const suspendedCount = distributors.filter((d) => d.status === "suspended").length;

  const filtered = distributors.filter(
    (d) => d.phone.includes(search) || d.referral_code.toLowerCase().includes(search.toLowerCase())
  );

  function getSortValue(d: Distributor, key: SortKey): number {
    if (key === "referral_count") return d.referral_count;
    if (key === "total_commission") return d.total_commission;
    if (key === "total_revenue") return d.total_revenue;
    if (key === "total_payout") return d.total_payout;
    return 0;
  }
  const sorted = sortBy
    ? [...filtered].sort((a, b) => getSortValue(b, sortBy) - getSortValue(a, sortBy))
    : filtered;

  function toggleSort(key: SortKey) {
    setSortBy((prev) => (prev === key ? null : key));
  }

  function exportDistributorsCsv(data: Distributor[]) {
    const headers = ["전화번호","코드","유치인원","누적매출","커미션","지급완료","상태","수수료율"];
    const rows = data.map(d => [d.phone, d.referral_code, d.referral_count, d.total_revenue, d.total_commission, d.total_payout, d.status === "suspended" ? "정지" : "활성", d.commission_rate_override != null ? `${(d.commission_rate_override * 100).toFixed(1)}%` : "자동"]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "distributors.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const now = new Date();
  const dayStart = (daysAgo: number) => { const d = new Date(now); d.setDate(d.getDate() - daysAgo); d.setHours(0,0,0,0); return d; };
  const filteredPayouts = pendingPayouts.filter((p) => {
    if (dateRange === "all") return true;
    const created = new Date(p.created_at);
    const cutoff = dateRange === "today" ? dayStart(0) : dateRange === "7d" ? dayStart(7) : dayStart(30);
    return created >= cutoff;
  });

  async function handleSaveRate(tenantId: string) {
    const rate = parseFloat(rateEdits[tenantId]);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      toast("error", "0.0 ~ 1.0 사이의 값을 입력하세요");
      return;
    }
    setSavingRate((prev) => ({ ...prev, [tenantId]: true }));
    try {
      await setDistributorRate(tenantId, rate);
      toast("success", "커미션율이 변경되었습니다.");
      await load();
      setRateEdits((prev) => ({ ...prev, [tenantId]: "" }));
    } catch {
      toast("error", "커미션율 변경 실패");
    } finally {
      setSavingRate((prev) => ({ ...prev, [tenantId]: false }));
    }
  }

  async function handleSuspend(tenantId: string, currentStatus: string, reason: string) {
    if (!reason.trim()) {
      toast("error", "정지 사유를 입력하세요");
      return;
    }
    setSuspending((prev) => ({ ...prev, [tenantId]: true }));
    try {
      await suspendDistributor(tenantId, reason, currentStatus !== "suspended");
      toast("success", currentStatus === "suspended" ? "총판이 복구되었습니다." : "총판이 정지되었습니다.");
      await load();
      setSuspendReason((prev) => ({ ...prev, [tenantId]: "" }));
    } catch {
      toast("error", "처리 실패");
    } finally {
      setSuspending((prev) => ({ ...prev, [tenantId]: false }));
    }
  }

  async function handleApprovePayout(payoutId: string) {
    try {
      await approvePayout(payoutId);
      toast("success", "지급이 승인되었습니다.");
      await load();
    } catch {
      toast("error", "승인 실패");
    }
  }

  async function handleRejectPayout(payoutId: string) {
    const reason = rejectReasons[payoutId];
    if (!reason?.trim()) {
      toast("error", "거절 사유를 입력하세요");
      return;
    }
    try {
      await rejectPayout(payoutId, reason);
      toast("success", "지급이 거절되었습니다.");
      await load();
      setRejectReasons((prev) => ({ ...prev, [payoutId]: "" }));
    } catch {
      toast("error", "거절 처리 실패");
    }
  }

  async function handleBatchProcess() {
    try {
      const result = await batchProcessPayouts();
      toast("success", result.message);
      await load();
    } catch {
      toast("error", "정산 처리 실패");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">총판 관리</h1>
          <p className="text-xs text-app-text-muted mt-0.5">추천인/총판을 관리하고 커미션을 정산합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleBatchProcess}>
            <DollarSign className="h-3.5 w-3.5" /> 일괄 정산 생성
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportDistributorsCsv(filtered)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard icon={Users} label="총판 수" value={totalDistributors} color="text-blue-500" onClick={() => toggleSort(null)} />
        <SummaryCard icon={TrendingUp} label="유치 인원" value={totalReferrals} color="text-emerald-500" onClick={() => toggleSort("referral_count")} />
        <SummaryCard icon={DollarSign} label="커미션 총액" value={totalCommission.toLocaleString()} color="text-violet-500" suffix="원" onClick={() => toggleSort("total_commission")} />
        <SummaryCard icon={CheckCircle2} label="지급 완료" value={totalPayout.toLocaleString()} color="text-green-500" suffix="원" onClick={() => toggleSort("total_payout")} />
        <SummaryCard icon={Ban} label="정지" value={suspendedCount} color="text-red-500" />
      </div>

      <Panel
        accent="violet"
        title={<div className="flex items-center gap-2"><Users className="h-4 w-4" /> 총판 목록</div>}
        description="유치 인원수·누적 매출·커미션을 한눈에 확인하세요"
      >
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="전화번호 또는 추천인 코드 검색"
            className="w-full rounded-lg border border-app-border bg-app-card py-2 pl-8 pr-2 text-xs text-app-text placeholder:text-app-text-subtle outline-none focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15" />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="총판이 없습니다" description="아직 등록된 총판이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-2 py-2 text-left">전화번호</th>
                  <th className="px-2 py-2 text-left">코드</th>
                  <th className="px-2 py-2 text-right">유치</th>
                  <th className="px-2 py-2 text-right">매출</th>
                  <th className="px-2 py-2 text-right">커미션</th>
                  <th className="px-2 py-2 text-right">지급</th>
                  <th className="px-2 py-2 text-center">상태</th>
                  <th className="px-2 py-2 text-center">수수료율</th>
                  <th className="px-2 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filtered.map((d) => (
                  <tr key={d.tenant_id} className="hover:bg-app-card-hover/50 transition-colors">
                    <td className="px-2 py-2.5 font-medium text-app-text">{d.phone}</td>
                    <td className="px-2 py-2.5 font-mono text-app-text-muted">{d.referral_code}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-emerald-500">{d.referral_count}</td>
                    <td className="px-2 py-2.5 text-right text-app-text">{d.total_revenue.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-right text-violet-500">{d.total_commission.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-right text-app-text-muted">{d.total_payout.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center">
                      <Badge tone={d.status === "suspended" ? "danger" : "success"}>
                        {d.status === "suspended" ? "정지" : "활성"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <input type="number" step="0.05" min="0" max="1"
                          value={rateEdits[d.tenant_id] ?? d.commission_rate_override ?? ""}
                          onChange={(e) => setRateEdits((prev) => ({ ...prev, [d.tenant_id]: e.target.value }))}
                          placeholder={d.commission_rate_override != null ? `${(d.commission_rate_override * 100).toFixed(1)}%` : "등급 자동"}
                          className="w-16 rounded border border-app-border bg-app-bg px-1 py-0.5 text-[10px] text-app-text text-center outline-none" />
                        {rateEdits[d.tenant_id] && (
                          <button onClick={() => handleSaveRate(d.tenant_id)} disabled={savingRate[d.tenant_id]}
                            className="text-[10px] text-app-primary hover:underline shrink-0">
                            {savingRate[d.tenant_id] ? "..." : "적용"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <input type="text" value={suspendReason[d.tenant_id] ?? ""}
                          onChange={(e) => setSuspendReason((prev) => ({ ...prev, [d.tenant_id]: e.target.value }))}
                          placeholder="정지 사유" className="w-20 rounded border border-app-border bg-app-bg px-1 py-0.5 text-[10px] text-app-text outline-none" />
                        <button onClick={() => handleSuspend(d.tenant_id, d.status, suspendReason[d.tenant_id] ?? "")}
                          disabled={suspending[d.tenant_id]}
                          className={cn("text-[10px] hover:underline shrink-0", d.status === "suspended" ? "text-green-500" : "text-red-500")}>
                          {suspending[d.tenant_id] ? "..." : d.status === "suspended" ? "복구" : "정지"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        accent="amber"
        title={<div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> 지급 대기 목록</div>}
        description="수동 검토 후 지급 승인 또는 거절 처리"
      >
        {payoutsLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : pendingPayouts.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="지급 대기 없음" description="모든 정산이 처리되었습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-2 py-2 text-left">총판</th>
                  <th className="px-2 py-2 text-right">금액</th>
                  <th className="px-2 py-2 text-right">요청일</th>
                  <th className="px-2 py-2 text-center">거절 사유</th>
                  <th className="px-2 py-2 text-center">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {pendingPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-app-card-hover/50 transition-colors">
                    <td className="px-2 py-2.5 font-medium text-app-text">{p.referrer_phone}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-violet-500">{p.amount.toLocaleString()}원</td>
                    <td className="px-2 py-2.5 text-right text-app-text-muted">{formatDateTime(p.created_at)}</td>
                    <td className="px-2 py-2.5 text-center">
                      <input type="text" value={rejectReasons[p.id] ?? ""}
                        onChange={(e) => setRejectReasons((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="거절 시 사유 입력" className="w-32 rounded border border-app-border bg-app-bg px-1.5 py-0.5 text-[10px] text-app-text outline-none" />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleApprovePayout(p.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-500/10 transition-colors">
                          <CheckCircle2 className="h-3 w-3" /> 승인
                        </button>
                        <button onClick={() => handleRejectPayout(p.id)}
                          disabled={!rejectReasons[p.id]?.trim()}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                          <XCircle className="h-3 w-3" /> 거절
                        </button>
                      </div>
                    </td>
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

function SummaryCard({ icon: Icon, label, value, color, suffix }: { icon: any; label: string; value: string | number; color: string; suffix?: string }) {
  return (
    <div className="rounded-xl border border-app-border/50 bg-app-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[10px] text-app-text-muted">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}{suffix ?? ""}</p>
    </div>
  );
}
