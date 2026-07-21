"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  const [toppingUp, setToppingUp] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleTopUp() {
    if (!phoneInput.trim() || toppingUp) return;
    setToppingUp(true);
    // Optimistically update localStorage (server sync via backend API later)
    try {
      const key = "telemon_tokens_admin_topup";
      const log: { phone: string; amount: number; time: string }[] = JSON.parse(localStorage.getItem(key) || "[]");
      log.push({ phone: phoneInput, amount, time: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(log));
      setDone(true);
      setPhoneInput("");
      toast("success", `${phoneInput}에 ${amount.toLocaleString()}토큰 충전 완료`);
      onTopUp();
    } catch { toast("error", "충전 실패"); }
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
      {done && <p className="mt-2 text-xs text-app-success">✅ 충전 내역이 기록되었습니다. 서버 API 연동 시 실제 적용됩니다.</p>}
    </Panel>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<DashboardUser | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<DashboardUser | null>(null);
  const [deletePhone, setDeletePhone] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setUsers(await api.fetchUsers()); } catch (err) { setError(err instanceof Error ? err.message : "사용자 목록 로드 실패"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

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
        {/* Users table with enriched info */}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-4 py-3 text-left font-semibold">전화번호</th>
                  <th className="px-4 py-3 text-left font-semibold">플랜</th>
                  <th className="px-4 py-3 text-left font-semibold">구독상태</th>
                  <th className="px-4 py-3 text-center font-semibold">계정수</th>
                  <th className="px-4 py-3 text-center font-semibold">별 잔액</th>
                  <th className="px-4 py-3 text-left font-semibold">가입일</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-app-card-hover">
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
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReissue(u)} title="API 키 재발급">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={u.isActive ? "danger" : "secondary"}
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => setToggleConfirm(u)}
                        >
                          {u.isActive ? "비활성" : "활성"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-app-danger hover:bg-app-danger-muted/20"
                          onClick={() => { setDeletePhone(u.phone); setDeleteConfirmOpen(true); }}
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