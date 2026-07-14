"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, KeyRound, RefreshCw, Smartphone, UserCheck, UserX, Users, XCircle, Search, ExternalLink, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineError } from "@/components/ui/InlineError";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { DashboardUser, UserLookupResult } from "@/lib/api";

import { formatDateTime } from "@/lib/formatTime";

function ManualIssueSection({ onIssued }: { onIssued: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [memo, setMemo] = useState("");
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
      const result = await api.manualIssueApiKey(lookupResult.phone, memo.trim() || undefined);
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

  async function handleCopy() {
    if (issuedKey) {
      try { await navigator.clipboard.writeText(issuedKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      catch { /* fallback */ }
    }
  }

  return (
    <Panel
      title={
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-app-primary" />
          API 키 수동 발급
        </div>
      }
      description="자동 발급 실패 시 운영자가 사용자를 조회하여 직접 API 키를 발급합니다. (AdminAuditLog에 기록됨)"
    >
      <form onSubmit={handleSearch} className="flex gap-3 items-end">
        <div className="flex-1">
          <Field label="전화번호 또는 텔레그램 ID">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="+821012345678 또는 tg_8916075854"
            />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={searching || !searchQuery.trim()}>
          <Search className="h-3.5 w-3.5" /> 조회
        </Button>
      </form>

      {error && <InlineError className="mt-3">{error}</InlineError>}

      {searching && <p className="mt-3 text-xs text-app-text-muted">조회 중...</p>}

      {lookupResult === null && !searching && (
        <p className="mt-3 text-xs text-app-text-muted">조회된 사용자가 없습니다. 전화번호 또는 tg_{"<"}id{">"} 형식으로 입력하세요.</p>
      )}

      {lookupResult && (
        <div className="mt-4 space-y-4">
          {/* User state */}
          <div className="rounded-xl border border-app-border bg-app-surface p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-app-text-muted shrink-0" />
              <span className="font-medium text-app-text">{lookupResult.phone ?? "—"}</span>
              <Badge tone={lookupResult.isActive ? "success" : "neutral"}>
                {lookupResult.isActive ? "활성" : "비활성"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-app-text-subtle">
              <span>가입 {lookupResult.createdAt ? formatDateTime(lookupResult.createdAt) : "—"}</span>
              {lookupResult.lastLogin && <span>로그인 {formatDateTime(lookupResult.lastLogin)}</span>}
              <Badge tone={lookupResult.hasApiKey ? "success" : "neutral"}>
                {lookupResult.hasApiKey ? "API 키 있음" : "API 키 없음"}
              </Badge>
            </div>
            {lookupResult.telegramVerificationStatus && (
              <div className="flex items-center gap-2 text-app-text-subtle">
                <CheckCircle2 className="h-3 w-3 text-app-success shrink-0" />
                <span>텔레그램 인증: {lookupResult.telegramVerificationStatus}</span>
              </div>
            )}
            {lookupResult.trialExpiresAt && (
              <div className="flex items-center gap-2 text-app-text-subtle">
                <span>체험 만료: {formatDateTime(lookupResult.trialExpiresAt)}</span>
                <Badge tone={lookupResult.subscriptionStatus === "active" ? "success" : "neutral"}>
                  {lookupResult.subscriptionStatus}
                </Badge>
              </div>
            )}
          </div>

          {/* Issue area */}
          {!lookupResult.phone && (
            <p className="text-xs text-app-text-muted">연결된 사용자 계정이 없습니다. 먼저 회원가입을 진행해주세요.</p>
          )}

          {lookupResult.hasApiKey && (
            <p className="text-xs text-app-text-muted">이미 API 키가 발급된 사용자입니다. 재발급은 위 사용자 목록에서 가능합니다.</p>
          )}

          {!lookupResult.hasApiKey && lookupResult.phone && !issuedKey && (
            <div className="space-y-3">
              <Field label="발급 사유 (선택, AdminAuditLog에 기록)">
                <Input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="예: 자동 발급 실패로 인한 운영자 수동 발급"
                />
              </Field>
              <Button onClick={handleIssue} variant="primary" disabled={issuing}>
                <KeyRound className="h-3.5 w-3.5" /> API 키 수동 발급
              </Button>
            </div>
          )}

          {issuedKey && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">지금만 전체가 표시됩니다. 안전한 곳에 복사해두세요.</p>
              <code className="block break-all rounded-lg border border-amber-500/10 bg-app-card px-3 py-2 text-sm text-app-text font-mono">
                {issuedKey}
              </code>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopy} className="flex-1">
                  <Copy className="h-3.5 w-3.5" /> {copied ? "복사됨" : "복사"}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setIssuedKey(null); setMemo(""); setSearchQuery(""); setLookupResult(null); }}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reissuedKey, setReissuedKey] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<DashboardUser | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<DashboardUser | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.fetchUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "사용자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(user: DashboardUser) {
    try {
      await api.toggleUser(user.id, !user.isActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태 변경에 실패했습니다.");
    }
  }

  async function handleReissue(user: DashboardUser) { setConfirmUser(user); }

  async function handleConfirmReissue() {
    if (!confirmUser) return;
    try {
      const key = await api.reissueUserApiKey(confirmUser.id);
      setReissuedKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 재발급에 실패했습니다.");
    } finally { setConfirmUser(null); }
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">사용자 관리</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">
            {users.length}명 중 {activeCount}명 활성
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-1 text-xs text-app-primary-hover hover:underline transition-colors">
            <ChevronLeft className="h-3 w-3" /> 관리자 홈
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-muted transition-all duration-150 hover:border-app-border-strong hover:text-app-text"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> 새로고침
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center transition-colors hover:border-app-border-strong">
          <div className="text-2xl font-bold text-app-text tabular-nums">{users.length}</div>
          <div className="text-xs text-app-text-muted mt-0.5">전체</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center transition-colors hover:border-app-border-strong">
          <div className="text-2xl font-bold text-app-success tabular-nums">{activeCount}</div>
          <div className="text-xs text-app-text-muted mt-0.5">활성</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center transition-colors hover:border-app-border-strong">
          <div className="text-2xl font-bold text-app-danger tabular-nums">{users.length - activeCount}</div>
          <div className="text-xs text-app-text-muted mt-0.5">비활성</div>
        </div>
      </div>

      {/* Manual API key issuance section */}
      <ManualIssueSection onIssued={load} />

      {/* Reissued key dialog */}
      {reissuedKey && (
        <Panel
          accent="amber"
          title={
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" />
              재발급된 API 키
            </div>
          }
        >
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">지금만 전체가 표시됩니다. 안전한 곳에 복사해두세요.</p>
            <code className="mt-2 block break-all rounded-lg border border-amber-500/10 bg-app-card px-3 py-2 text-sm text-app-text font-mono">
              {reissuedKey}
            </code>
          </div>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setReissuedKey(null)}>
            닫기
          </Button>
        </Panel>
      )}

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
        <div className="divide-y divide-app-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3 text-sm transition-colors hover:bg-app-card-hover -mx-4 px-4 first:rounded-t-lg last:rounded-b-lg">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-app-text-muted shrink-0" />
                  <span className="font-medium text-app-text">{u.phone}</span>
                  <Badge tone={u.isActive ? "success" : "neutral"}>
                    {u.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-text-subtle">
                  <span>가입 {formatDateTime(u.createdAt)}</span>
                  {u.lastLogin && (
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      마지막 로그인 {formatDateTime(u.lastLogin)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleReissue(u)}>
                  <KeyRound className="h-3 w-3" /> 키 재발급
                </Button>
                <Button
                  variant={u.isActive ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => setToggleConfirm(u)}
                >
                  {u.isActive ? "비활성화" : "활성화"}
                </Button>
              </div>
            </div>
          ))}
        </div>
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