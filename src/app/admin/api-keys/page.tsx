"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, Copy, Key, KeyRound, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { ApiKey } from "@/lib/api";

import { formatDateTime } from "@/lib/formatTime";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  lifetime: "Lifetime",
};

const PLAN_OPTIONS = [
  { value: "free", label: "Free (1계정, 하루 100회)" },
  { value: "pro", label: "Pro (10계정, 하루 5,000회)" },
  { value: "team", label: "Team (50계정, 하루 50,000회)" },
] as const;

function ApiKeysContent() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "team">("free");
  const [maxAccounts, setMaxAccounts] = useState<number>(1);
  const [dailyLimit, setDailyLimit] = useState<number>(100);
  const [creating, setCreating] = useState(false);
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  // Set default limits when plan changes
  useEffect(() => {
    switch (plan) {
      case "free": setMaxAccounts(1); setDailyLimit(100); break;
      case "pro": setMaxAccounts(10); setDailyLimit(5000); break;
      case "team": setMaxAccounts(50); setDailyLimit(50000); break;
    }
  }, [plan]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.fetchApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createApiKey({ name: name.trim(), plan, maxAccounts, dailyLimit });
      setJustCreatedKey(created.key);
      setName("");
      await load();
      toast("success", "API 키가 발급되었습니다. 지금 복사해두세요.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "API 키 생성에 실패했습니다.";
      setError(msg);
      toast("error", msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await api.deleteApiKey(deleteTarget.id);
      await load();
      toast("success", `"${deleteTarget.name}" 키가 삭제되었습니다.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "API 키 삭제에 실패했습니다.";
      setError(msg);
      toast("error", msg);
    } finally {
      setDeleteTarget(null);
      setDeletingId(null);
    }
  }

  async function copyToClipboard(text: string, keyId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(keyId);
      toast("success", "클립보드에 복사되었습니다.");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast("error", "복사에 실패했습니다. 수동으로 복사해주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">API 키 관리</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">{keys.length}개 키 발급됨</p>
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

      <Panel
        title={
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-app-primary" />
            새 API 키 발급
          </div>
        }
        description="외부 프로그램/스크립트가 X-API-Key 헤더로 사용할 키입니다. 플랜별 제한을 설정할 수 있습니다."
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Field label="키 이름">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 외부 연동용"
                  required
                />
              </Field>
            </div>
            <div>
              <Field label="플랜">
                <Select value={plan} onChange={(e) => setPlan(e.target.value as "free" | "pro" | "team")}>
                  {PLAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="최대 계정 수">
              <Input
                type="number"
                min={1}
                value={maxAccounts}
                onChange={(e) => setMaxAccounts(Number(e.target.value))}
              />
            </Field>
            <Field label="일일 API 호출 제한">
              <Input
                type="number"
                min={0}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={creating} disabled={creating || !name.trim()}>
              <Key className="h-3.5 w-3.5" /> 발급
            </Button>
          </div>
        </form>

        {justCreatedKey && (
          <div className="mt-4 rounded-xl border border-app-warning/20 bg-app-warning-muted p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-app-warning">
              <KeyRound className="h-4 w-4" />
              <span>⚠ 이 키는 지금만 전체가 표시됩니다. 안전한 곳에 저장하세요.</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-app-warning/10 bg-app-card px-3 py-2.5 text-sm text-app-text font-mono shadow-sm">
                {justCreatedKey}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(justCreatedKey, "new-key")}
                className="shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedId === "new-key" ? "복사됨" : "복사"}
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setJustCreatedKey(null)}>
                확인했습니다
              </Button>
            </div>
          </div>
        )}

        {error && <InlineError className="mt-3">{error}</InlineError>}
      </Panel>

      <Panel
        title={
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            발급된 키 목록
          </div>
        }
        description="모든 키는 SHA-256 해시로 저장되어 원본을 다시 조회할 수 없습니다."
      >
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!loading && error && <InlineError>{error}</InlineError>}

        {!loading && !error && keys.length === 0 && (
          <EmptyState
            icon={KeyRound}
            title="발급된 API 키 없음"
            description="위 폼에서 새 키를 발급해주세요."
          />
        )}
        {!loading && keys.length > 0 && (
          <div className="divide-y divide-app-border">
            {keys.map((k) => {
              const isDeleting = deletingId === k.id;
              return (
                <div
                  key={k.id}
                  data-testid={`api-key-row-${k.id}`}
                  className={cn(
                    "flex items-center justify-between py-3 text-sm transition-colors -mx-4 px-4 first:rounded-t-lg last:rounded-b-lg",
                    isDeleting ? "opacity-50" : "hover:bg-app-card-hover"
                  )}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-app-text truncate">{k.name}</span>
                      <Badge tone={k.isActive ? "success" : "neutral"}>
                        {k.isActive ? "활성" : "비활성"}
                      </Badge>
                      <Badge tone="info">{PLAN_LABEL[k.plan] ?? k.plan}</Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-app-text-muted">
                      <code className="font-mono text-app-text-subtle">{k.maskedKey}</code>
                      <span>생성 {formatDateTime(k.createdAt)}</span>
                      <span>계정 {k.maxAccounts}개 · 일일 {k.dailyLimit.toLocaleString()}회</span>
                      {k.lastUsed && <span>· 마지막 사용 {formatDateTime(k.lastUsed)}</span>}
                      {!k.lastUsed && <span className="text-app-text-subtle">· 사용 기록 없음</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget(k)}
                      loading={isDeleting}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3 w-3" /> 삭제
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!deleteTarget}
        title="API 키 삭제"
        description={deleteTarget
          ? `"${deleteTarget.name}" 키를 삭제하면 이 키를 사용하는 모든 프로그램의 접근이 즉시 차단됩니다. 이 작업은 되돌릴 수 없습니다.`
          : ""}
        variant="danger"
        confirmLabel="영구 삭제"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function ApiKeysPage() {
  return (
    <AdminGuard requireAdmin>
      <ApiKeysContent />
    </AdminGuard>
  );
}