"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, Key, KeyRound, Plus, RefreshCw, Shield, Trash2, XCircle } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { ApiKey } from "@/lib/api";

function formatDateTime(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

function ApiKeysContent() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.fetchApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createApiKey(name.trim());
      setJustCreatedKey(created.key);
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteApiKey(deleteTarget.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 삭제에 실패했습니다.");
    } finally {
      setDeleteTarget(null);
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
        accent="violet"
        title={
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-400" />
            새 API 키 발급
          </div>
        }
        description="외부 프로그램/스크립트가 X-API-Key 헤더로 사용할 키입니다."
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="키 이름">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 외부 연동용"
                required
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={creating} loading={creating}>
            <Key className="h-3.5 w-3.5" /> 발급
          </Button>
        </form>

        {justCreatedKey && (
          <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400">
              <KeyRound className="h-4 w-4" />
              발급된 키는 지금만 전체가 표시됩니다
            </div>
            <code className="mt-3 block break-all rounded-lg border border-violet-500/10 bg-app-card px-3 py-2.5 text-sm text-app-text font-mono shadow-sm">
              {justCreatedKey}
            </code>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setJustCreatedKey(null)}>
              확인했습니다
            </Button>
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
              <div key={i} className="h-14 animate-pulse rounded-xl bg-app-card-hover" />
            ))}
          </div>
        )}
        {!loading && keys.length === 0 && (
          <EmptyState
            icon={KeyRound}
            title="발급된 API 키 없음"
            description="위 폼에서 새 키를 발급해주세요."
          />
        )}
        <div className="divide-y divide-app-border">
          {keys.map((k) => (
            <div
              key={k.id}
              data-testid={`api-key-row-${k.id}`}
              className="flex items-center justify-between py-3 text-sm transition-colors hover:bg-app-card-hover -mx-4 px-4 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-app-text truncate">{k.name}</span>
                  <Badge tone="neutral">API 키</Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-app-text-muted">
                  <code className="font-mono text-app-text-subtle">{k.maskedKey}</code>
                  <span>생성 {formatDateTime(k.createdAt)}</span>
                  {k.lastUsed && <span>· 마지막 사용 {formatDateTime(k.lastUsed)}</span>}
                  {!k.lastUsed && <span className="text-app-text-subtle">· 사용 기록 없음</span>}
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteTarget(k)}
              >
                <Trash2 className="h-3 w-3" /> 삭제
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <ConfirmDialog
        open={!!deleteTarget}
        title="API 키 삭제"
        description={deleteTarget ? `"${deleteTarget.name}" 키를 삭제하면 이 키를 쓰는 프로그램은 즉시 접근이 끊깁니다. 삭제할까요?` : ""}
        variant="danger"
        confirmLabel="삭제"
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