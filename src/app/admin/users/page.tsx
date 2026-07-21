"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, KeyRound, RefreshCw, Smartphone, UserCheck, Users, Search, CheckCircle2, Copy, Trash2, AlertTriangle, Zap, Sparkles, TrendingUp } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineError } from "@/components/ui/InlineError";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { DashboardUser, UserLookupResult } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/formatTime";

function ManualIssueSection({ onIssued }: { onIssued: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [memo, setMemo] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "team">("team");
  const [lookupResult, setLookupResult] = useState<UserLookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || searching) return;
    setSearching(true); setError(null); setLookupResult(null); setIssuedKey(null);
    try {
      const result = await api.adminUserLookup(searchQuery.trim());
      setLookupResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사용자 조회에 실패했습니다.");
    } finally { setSearching(false); }
  }

  async function handleIssue() {
    if (!lookupResult?.phone || issuing) return;
    setIssuing(true); setError(null); setIssuedKey(null);
    try {
      const result = await api.manualIssueApiKey(lookupResult.phone, memo.trim() || undefined, plan);
      if (result.alreadyIssued) {
        setError("이미 API 키가 발급된 사용자입니다.");
      } else {
        setIssuedKey(result.apiKey);
        onIssued();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 발급에 실패했습니다.");
    } finally { setIssuing(false); }
  }

  const hasResult = lookupResult && lookupResult.userId;

  return (
    <Panel title={
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-amber-400" />
        수동 API 키 발급
      </div>
    } description="관리자가 원하는 사용자에게 직접 API 키를 발급합니다.">
      <form onSubmit={handleSearch} className="mb-3 flex items-start gap-2">
        <div className="flex-1">
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="전화번호 입력..." required />
        </div>
        <Button type="submit" disabled={searching}>{searching ? "검색 중..." : "조회"}</Button>
      </form>
      {error && <InlineError className="mb-3">{error}</InlineError>}
      {hasResult && !issuedKey && (
        <div className="rounded-xl border border-app-border bg-app-bg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-app-text-muted">전화번호</span><p className="font-medium text-app-text">{lookupResult.phone}</p></div>
            <div><span className="text-app-text-muted">상태</span><p className="font-medium">{lookupResult.isActive ? "활성" : "비활성"}</p></div>
            <div><span className="text-app-text-muted">플랜</span><p className="font-medium">{lookupResult.tenantPlan ?? "-"}</p></div>
            <div><span className="text-app-text-muted">API 키</span><p className="font-medium">{lookupResult.hasApiKey ? "✅ 있음" : "❌ 없음"}</p></div>
          </div>
          <div className="space-y-2">
            <Select value={plan} onChange={(e) => setPlan(e.target.value as "free" | "pro" | "team")}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </Select>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="발급 사유 (선택)" />
            <Button onClick={handleIssue} disabled={issuing} loading={issuing} className="w-full">
              <KeyRound className="h-4 w-4" /> API 키 발급
            </Button>
          </div>
        </div>
      )}
      {issuedKey && (
        <div className="rounded-xl border border-app-success/30 bg-app-success-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-app-success"><CheckCircle2 className="h-4 w-4" /> 발급 완료</div>
          <code className="block break-all rounded-lg bg-app-bg p-2 text-xs font-mono">{issuedKey}</code>
          <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(issuedKey); } catch {} }}>
            <Copy className="h-3 w-3" /> 복사
          </Button>
        </div>
      )}
    </Panel>
  );
}

function DeleteUserByPhoneSection({ onDeleted }: { onDeleted: () => void }) {
  const [phone, setPhone] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    setConfirmOpen(false);
    if (!phone.trim() || deleting) return;
    setDeleting(true); setError(null);
    try {
      const result = await api.adminDeleteUserByPhone(phone.trim());
      setDone(true);
      setPhone("");
      onDeleted();
      toast("success", `사용자 ${result.phone} 삭제 완료`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally { setDeleting(false); }
  }

  return (
    <Panel
      accent="rose"
      title={
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-rose-400" />
          전화번호로 사용자 삭제
        </div>
      }
      description="DB에서 사용자 + Tenant + 세션을 완전히 삭제합니다. 삭제 후 Telegram Login Widget으로 재가입 가능합니다."
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="전화번호 (예: +819010679014)"
            className="font-mono"
          />
        </div>
        <Button
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          disabled={!phone.trim() || deleting}
          loading={deleting}
        >
          <Trash2 className="h-4 w-4" /> 삭제
        </Button>
      </div>
      {error && <InlineError className="mt-2">{error}</InlineError>}
      {done && <p className="mt-2 text-xs text-app-success">✅ 삭제 완료. Telegram Login으로 재가입 가능합니다.</p>}
      <p className="mt-2 text-[10px] text-app-text-subtle">
        ⚠️ 이 작업은 되돌릴 수 없습니다. 사용자의 모든 데이터(발송 내역 제외)가 삭제됩니다.
      </p>

      <ConfirmDialog
        open={confirmOpen}
        title="사용자 삭제"
        description={`"${phone}" — 이 전화번호의 사용자와 연결된 Tenant, 세션을 영구 삭제합니다. 계속할까요?`}
        variant="danger"
        confirmLabel="영구 삭제"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Panel>
  );
}

function TokenTopUpSection({ onTopUp }: { onTopUp: () => void }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [amount, setAmount] = useState(1000);
  const [memo, setMemo] = useState("관리자 수동 충전");
  const [toppingUp, setToppingUp] = useState(false);
  const [done, setDone] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleTopUp() {
    if (!phoneInput.trim() || toppingUp) return;
    setToppingUp(true);
    setResultText(null);
    try {
      const lookup = await api.adminUserLookup(phoneInput.trim());
      if (!lookup?.userId) {
        toast("error", "해당 전화번호 사용자를 찾을 수 없습니다.");
        return;
      }
      const result = await api.adminTopUpTokens(lookup.userId, amount, memo.trim() || undefined);
      setDone(true);
      setResultText(`충전 완료: 새 잔액 ${result.newBalance.toLocaleString()} 토큰`);
      setPhoneInput("");
      toast("success", `${lookup.phone ?? "사용자"}에 ${amount.toLocaleString()}토큰 충전 완료`);
      onTopUp();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "충전 실패");
    }
    finally { setToppingUp(false); }
  }

  return (
    <Panel
      accent="amber"
      title={<div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> 토큰 수동 충전</div>}
      description="사용자에게 토큰을 직접 지급합니다. (로컬: 로그 기록, 서버: API 필요)"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="전화번호" className="font-mono" />
        </div>
        <div className="min-w-[180px]">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="사유 메모" />
        </div>
        <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}
          className="rounded-lg border border-app-border bg-app-card px-2 py-2 text-xs text-app-text outline-none">
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1,000</option>
          <option value={5000}>5,000</option>
          <option value={10000}>10,000</option>
        </select>
        <Button variant="primary" onClick={handleTopUp} disabled={!phoneInput.trim() || toppingUp} loading={toppingUp}>
          <Zap className="h-3.5 w-3.5" /> 충전
        </Button>
      </div>
      {done && <p className="mt-2 text-xs text-app-success">✅ {resultText ?? "충전 완료"}</p>}
    </Panel>
  );
}

function UsersContent() {
  type UserFilterState = {
    search: string;
    plan: "all" | "free" | "pro" | "team";
    subscription: "all" | "active" | "inactive";
    activity: "all" | "active" | "inactive";
    minAccounts: "all" | "1" | "3" | "5";
  };
  type SavedView = { name: string; filters: UserFilterState };
  const SAVED_VIEW_KEY = "telemon_admin_users_saved_views_v1";

  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<DashboardUser | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<DashboardUser | null>(null);
  const [deletePhone, setDeletePhone] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [billingPlan, setBillingPlan] = useState<"keep" | "free" | "pro" | "team">("keep");
  const [billingSubscription, setBillingSubscription] = useState<"keep" | "active" | "inactive" | "pending" | "past_due" | "canceled">("keep");
  const [extendTrialDays, setExtendTrialDays] = useState<number>(7);
  const [billingLoading, setBillingLoading] = useState(false);
  const [filters, setFilters] = useState<UserFilterState>({
    search: "",
    plan: "all",
    subscription: "all",
    activity: "all",
    minAccounts: "all",
  });
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [newViewName, setNewViewName] = useState("");

  const load = async () => {
    setLoading(true); setError(null);
    try { setUsers(await api.fetchUsers()); } catch (err) { setError(err instanceof Error ? err.message : "사용자 목록 로드 실패"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedUser) return;
    setBillingPlan("keep");
    setBillingSubscription("keep");
    setExtendTrialDays(7);
  }, [selectedUser?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedView[];
      if (!Array.isArray(parsed)) return;
      setSavedViews(parsed.filter((v) => !!v?.name && !!v?.filters));
    } catch {
      // Keep UX resilient even if local storage is malformed.
    }
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        if (!u.phone.toLowerCase().includes(q)) return false;
      }
      if (filters.plan !== "all" && (u.plan ?? "free") !== filters.plan) return false;
      if (filters.subscription !== "all") {
        const status = u.subscriptionStatus === "active" ? "active" : "inactive";
        if (status !== filters.subscription) return false;
      }
      if (filters.activity !== "all") {
        const activity = u.isActive ? "active" : "inactive";
        if (activity !== filters.activity) return false;
      }
      if (filters.minAccounts !== "all") {
        const min = Number(filters.minAccounts);
        if (u.accountCount < min) return false;
      }
      return true;
    });
  }, [users, filters]);

  const riskUsers = useMemo(
    () => filteredUsers.filter((u) => !u.isActive || (u.subscriptionStatus && u.subscriptionStatus !== "active") || u.accountCount === 0).length,
    [filteredUsers],
  );

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.includes(u.id));

  function saveCurrentView() {
    const name = newViewName.trim();
    if (!name) return;
    const deduped = savedViews.filter((v) => v.name !== name);
    const next = [{ name, filters }, ...deduped].slice(0, 8);
    setSavedViews(next);
    setNewViewName("");
    try {
      localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures (private mode / quota) without breaking workflow.
    }
  }

  function applySavedView(view: SavedView) {
    setFilters(view.filters);
  }

  function removeSavedView(name: string) {
    const next = savedViews.filter((v) => v.name !== name);
    setSavedViews(next);
    try {
      localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures.
    }
  }

  function resetFilters() {
    setFilters({ search: "", plan: "all", subscription: "all", activity: "all", minAccounts: "all" });
  }

  function toggleSelectUser(userId: string) {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredUsers.some((u) => u.id === id)));
      return;
    }
    const merged = new Set([...selectedIds, ...filteredUsers.map((u) => u.id)]);
    setSelectedIds(Array.from(merged));
  }

  async function runBulkToggle(nextActive: boolean) {
    if (selectedIds.length === 0 || bulkLoading) return;
    setBulkLoading(true);
    setError(null);
    try {
      await Promise.all(selectedIds.map((id) => api.toggleUser(id, nextActive)));
      await load();
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "대량 상태 변경 실패");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleReissue(u: DashboardUser) {
    setConfirmUser(u);
  }

  async function handleConfirmReissue() {
    if (!confirmUser) return;
    try {
      const newKey = await api.reissueUserApiKey(confirmUser.id, "Admin reissue");
      alert(`새 API 키: ${newKey}\n\n이 키는 한 번만 표시됩니다.`);
      setConfirmUser(null);
    } catch { setError("키 재발급 실패"); }
  }

  async function handleToggle(u: DashboardUser) {
    try {
      await api.toggleUser(u.id, !u.isActive);
      await load();
    } catch { setError("상태 변경 실패"); }
  }

  async function refreshUsersAndSelection(userId: string) {
    const next = await api.fetchUsers();
    setUsers(next);
    const refreshed = next.find((u) => u.id === userId) ?? null;
    setSelectedUser(refreshed);
  }

  async function handleBillingUpdate() {
    if (!selectedUser || billingLoading) return;
    const payload: api.AdminBillingUpdateInput = {};
    if (billingPlan !== "keep") payload.plan = billingPlan;
    if (billingSubscription !== "keep") payload.subscriptionStatus = billingSubscription;
    if (extendTrialDays > 0) payload.extendTrialDays = extendTrialDays;
    if (!payload.plan && !payload.subscriptionStatus && !payload.extendTrialDays) {
      setError("변경할 결제/플랜 항목을 선택해주세요.");
      return;
    }
    setBillingLoading(true);
    setError(null);
    try {
      await api.adminUpdateUserBilling(selectedUser.id, payload);
      await refreshUsersAndSelection(selectedUser.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제/플랜 업데이트 실패");
    } finally {
      setBillingLoading(false);
    }
  }

  function getRiskLevel(u: DashboardUser): "normal" | "warning" | "high" {
    if (!u.isActive || (u.subscriptionStatus && u.subscriptionStatus !== "active")) return "high";
    if (u.accountCount === 0 || u.starsBalance < 100) return "warning";
    return "normal";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">사용자 관리</h1>
          <p className="text-sm text-app-text-muted">API 키 발급 및 사용자 계정 관리</p>
        </div>
        <Link href="/admin/dashboard" className="flex items-center gap-1 text-xs text-app-primary-hover hover:underline">
          <ChevronLeft className="h-3 w-3" /> 대시보드
        </Link>
      </div>

      <TokenTopUpSection onTopUp={() => {}} />
      <DeleteUserByPhoneSection onDeleted={load} />
      <ManualIssueSection onIssued={load} />

      {/* User list */}
      <Panel
        accent="cyan"
        title={
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            전화번호 인증 사용자
          </div>
        }
        description="본인 전화번호를 인증해 API 키를 발급받은 사용자입니다."
      >
        <div className="mb-4 space-y-3 rounded-xl border border-app-border bg-app-bg p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="전화번호 검색"
            />
            <Select
              value={filters.plan}
              onChange={(e) => setFilters((prev) => ({ ...prev, plan: e.target.value as UserFilterState["plan"] }))}
            >
              <option value="all">플랜 전체</option>
              <option value="free">무료</option>
              <option value="pro">프로</option>
              <option value="team">팀</option>
            </Select>
            <Select
              value={filters.subscription}
              onChange={(e) => setFilters((prev) => ({ ...prev, subscription: e.target.value as UserFilterState["subscription"] }))}
            >
              <option value="all">구독 전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성/기타</option>
            </Select>
            <Select
              value={filters.activity}
              onChange={(e) => setFilters((prev) => ({ ...prev, activity: e.target.value as UserFilterState["activity"] }))}
            >
              <option value="all">활성상태 전체</option>
              <option value="active">활성 사용자</option>
              <option value="inactive">비활성 사용자</option>
            </Select>
            <Select
              value={filters.minAccounts}
              onChange={(e) => setFilters((prev) => ({ ...prev, minAccounts: e.target.value as UserFilterState["minAccounts"] }))}
            >
              <option value="all">계정 수 전체</option>
              <option value="1">1개 이상</option>
              <option value="3">3개 이상</option>
              <option value="5">5개 이상</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
            <span>조회 {filteredUsers.length}명</span>
            <span>리스크 후보 {riskUsers}명</span>
            <span>선택 {selectedIds.length}명</span>
            <Button size="sm" variant="ghost" onClick={resetFilters}>필터 초기화</Button>
            <Button size="sm" variant="secondary" onClick={() => runBulkToggle(true)} disabled={selectedIds.length === 0 || bulkLoading} loading={bulkLoading}>선택 일괄 활성화</Button>
            <Button size="sm" variant="danger" onClick={() => runBulkToggle(false)} disabled={selectedIds.length === 0 || bulkLoading} loading={bulkLoading}>선택 일괄 비활성화</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-app-border pt-2">
            <Input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="저장 뷰 이름"
              className="w-full sm:w-52"
            />
            <Button size="sm" onClick={saveCurrentView} disabled={!newViewName.trim()}>현재 필터 저장</Button>
            {savedViews.map((view) => (
              <div key={view.name} className="flex items-center gap-1 rounded-lg border border-app-border px-2 py-1 text-xs">
                <button className="text-app-text hover:underline" onClick={() => applySavedView(view)}>{view.name}</button>
                <button className="text-app-text-muted hover:text-app-danger" onClick={() => removeSavedView(view.name)} aria-label={`${view.name} 삭제`}>x</button>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-app-card-hover" />
            ))}
          </div>
        )}
        {error && <InlineError>{error}</InlineError>}
        {!loading && !error && users.length === 0 && (
          <EmptyState icon={Users} title="가입한 사용자 없음" />
        )}
        {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
          <EmptyState icon={Users} title="필터 결과가 없습니다" />
        )}
        {/* Users table with enriched info */}
        {!loading && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-4 py-3 text-center font-semibold">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      aria-label="현재 필터 결과 전체 선택"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">전화번호</th>
                  <th className="px-4 py-3 text-left font-semibold">플랜</th>
                  <th className="px-4 py-3 text-left font-semibold">구독상태</th>
                  <th className="px-4 py-3 text-center font-semibold">계정수</th>
                  <th className="px-4 py-3 text-center font-semibold">별 잔액</th>
                  <th className="px-4 py-3 text-left font-semibold">리스크</th>
                  <th className="px-4 py-3 text-left font-semibold">가입일</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="cursor-pointer transition-colors hover:bg-app-card-hover" onClick={() => setSelectedUser(u)}>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={() => toggleSelectUser(u.id)}
                        aria-label={`${u.phone} 선택`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-app-text-muted" />
                        <span className="font-medium">{u.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.plan ? (
                        <Badge tone={u.plan === "team" ? "info" : u.plan === "pro" ? "success" : "neutral"}>
                          {u.plan === "team" ? "팀" : u.plan === "pro" ? "프로" : "무료"}
                        </Badge>
                      ) : (
                        <span className="text-app-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscriptionStatus ? (
                        <Badge tone={u.subscriptionStatus === "active" ? "success" : "danger"}>
                          {u.subscriptionStatus === "active" ? "활성" : "비활성"}
                        </Badge>
                      ) : (
                        <span className="text-app-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.accountCount > 0 ? (
                        <span className="font-semibold text-app-text">{u.accountCount}</span>
                      ) : (
                        <span className="text-app-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.starsBalance > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                          <span className="font-semibold text-yellow-600 dark:text-yellow-400">{u.starsBalance}</span>
                        </div>
                      ) : (
                        <span className="text-app-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getRiskLevel(u) === "high" && <Badge tone="danger">높음</Badge>}
                      {getRiskLevel(u) === "warning" && <Badge tone="warning">주의</Badge>}
                      {getRiskLevel(u) === "normal" && <Badge tone="success">정상</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-app-text-muted">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.isActive ? "success" : "neutral"}>
                        {u.isActive ? "활성" : "비활성"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleReissue(u); }} title="API 키 재발급">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={u.isActive ? "danger" : "secondary"}
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); setToggleConfirm(u); }}
                        >
                          {u.isActive ? "비활성" : "활성"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-app-danger hover:bg-app-danger-muted/20"
                          onClick={(e) => { e.stopPropagation(); setDeletePhone(u.phone); setDeleteConfirmOpen(true); }}
                          title="사용자 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelectedUser(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-app-border bg-app-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-app-text">사용자 360 상세</h2>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>닫기</Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-app-border bg-app-bg p-3">
                <p className="text-xs text-app-text-muted">전화번호</p>
                <p className="mt-1 font-semibold text-app-text">{selectedUser.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">플랜</p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.plan ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">구독 상태</p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.subscriptionStatus ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">연결 계정 수</p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.accountCount}</p>
                </div>
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">Stars 잔액</p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.starsBalance}</p>
                </div>
              </div>
              <div className="rounded-xl border border-app-border bg-app-bg p-3">
                <p className="text-xs text-app-text-muted">가입일</p>
                <p className="mt-1 text-app-text">{formatDateTime(selectedUser.createdAt)}</p>
                <p className="mt-2 text-xs text-app-text-muted">최근 로그인</p>
                <p className="mt-1 text-app-text">{selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : "로그인 이력 없음"}</p>
                <p className="mt-2 text-xs text-app-text-muted">트라이얼 만료</p>
                <p className="mt-1 text-app-text">{selectedUser.trialExpiresAt ? formatDateTime(selectedUser.trialExpiresAt) : "-"}</p>
                <p className="mt-2 text-xs text-app-text-muted">운영 리스크</p>
                <div className="mt-1">
                  {getRiskLevel(selectedUser) === "high" && <Badge tone="danger">높음</Badge>}
                  {getRiskLevel(selectedUser) === "warning" && <Badge tone="warning">주의</Badge>}
                  {getRiskLevel(selectedUser) === "normal" && <Badge tone="success">정상</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant={selectedUser.isActive ? "danger" : "primary"}
                  onClick={() => {
                    setToggleConfirm(selectedUser);
                  }}
                >
                  {selectedUser.isActive ? "비활성화" : "활성화"}
                </Button>
                <Button variant="secondary" onClick={() => handleReissue(selectedUser)}>API 키 재발급</Button>
              </div>

              <div className="rounded-xl border border-app-border bg-app-bg p-3">
                <p className="text-sm font-semibold text-app-text">결제/플랜 운영</p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Select value={billingPlan} onChange={(e) => setBillingPlan(e.target.value as typeof billingPlan)}>
                    <option value="keep">플랜 변경 안함</option>
                    <option value="free">무료로 변경</option>
                    <option value="pro">프로로 변경</option>
                    <option value="team">팀으로 변경</option>
                  </Select>
                  <Select value={billingSubscription} onChange={(e) => setBillingSubscription(e.target.value as typeof billingSubscription)}>
                    <option value="keep">구독상태 변경 안함</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="pending">pending</option>
                    <option value="past_due">past_due</option>
                    <option value="canceled">canceled</option>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={extendTrialDays}
                    onChange={(e) => setExtendTrialDays(Number(e.target.value || 0))}
                    placeholder="트라이얼 연장 일수"
                  />
                  <Button onClick={handleBillingUpdate} loading={billingLoading} disabled={billingLoading}>결제/플랜 반영</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmUser}
        title="API 키 재발급"
        description={confirmUser ? `${confirmUser.phone} 사용자의 API 키를 재발급하면 기존 키는 즉시 무효화됩니다. 계속할까요?` : ""}
        variant="danger"
        confirmLabel="재발급"
        onConfirm={handleConfirmReissue}
        onCancel={() => setConfirmUser(null)}
      />
      <ConfirmDialog
        open={deleteConfirmOpen && !!deletePhone}
        title="사용자 삭제"
        description={`"${deletePhone}" — 이 사용자와 연결된 Tenant, 세션을 영구 삭제합니다.`}
        variant="danger"
        confirmLabel="영구 삭제"
        onConfirm={async () => {
          const phone = deletePhone;
          setDeleteConfirmOpen(false);
          setDeletePhone(null);
          if (!phone) return;
          try {
            await api.adminDeleteUserByPhone(phone);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : "삭제 실패");
          }
        }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeletePhone(null); }}
      />
      <ConfirmDialog
        open={!!toggleConfirm}
        title={toggleConfirm?.isActive ? "사용자 비활성화" : "사용자 활성화"}
        description={toggleConfirm ? `"${toggleConfirm.phone}" 사용자를 ${toggleConfirm.isActive ? "비활성화" : "활성화"}하시겠습니까?` : ""}
        variant={toggleConfirm?.isActive ? "danger" : "default"}
        confirmLabel={toggleConfirm?.isActive ? "비활성화" : "활성화"}
        onConfirm={() => { const u = toggleConfirm; setToggleConfirm(null); if (u) handleToggle(u); }}
        onCancel={() => setToggleConfirm(null)}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <AdminGuard requireAdmin>
      <UsersContent />
    </AdminGuard>
  );
}