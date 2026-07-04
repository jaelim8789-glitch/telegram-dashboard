"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
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

  useEffect(() => {
    load();
  }, []);

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

  async function handleDelete(id: string) {
    if (!window.confirm("이 API 키를 삭제하면 이 키를 쓰는 프로그램은 즉시 접근이 끊깁니다. 삭제할까요?")) return;
    try {
      await api.deleteApiKey(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-100">API 키 관리</h1>
        <Link href="/" className="text-xs text-sky-400 hover:underline">
          대시보드로 돌아가기
        </Link>
      </div>

      <Panel title="새 API 키 발급" description="외부 프로그램/스크립트가 X-API-Key 헤더로 사용할 키입니다.">
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="이름">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 외부 연동용" required />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={creating}>
            {creating ? "발급 중..." : "발급"}
          </Button>
        </form>

        {justCreatedKey && (
          <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-xs text-emerald-400">
              발급된 키는 지금만 전체가 표시됩니다. 안전한 곳에 복사해두세요.
            </p>
            <code className="mt-1 block break-all text-sm text-neutral-100">{justCreatedKey}</code>
            <Button variant="ghost" className="mt-2 text-xs" onClick={() => setJustCreatedKey(null)}>
              닫기
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </Panel>

      <Panel title="발급된 키 목록">
        {loading && <p className="text-xs text-neutral-500">불러오는 중...</p>}
        {!loading && keys.length === 0 && <p className="text-xs text-neutral-500">발급된 API 키가 없습니다.</p>}
        <div className="divide-y divide-neutral-800">
          {keys.map((k) => (
            <div
              key={k.id}
              data-testid={`api-key-row-${k.id}`}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-neutral-200">{k.name}</div>
                <div className="text-xs text-neutral-500">
                  <code>{k.maskedKey}</code> · 생성 {formatDateTime(k.createdAt)}
                  {k.lastUsed && <> · 마지막 사용 {formatDateTime(k.lastUsed)}</>}
                </div>
              </div>
              <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => handleDelete(k.id)}>
                삭제
              </Button>
            </div>
          ))}
        </div>
      </Panel>
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
