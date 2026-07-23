"use client";

import { useEffect, useState, useCallback } from "react";
import { Key, Plus, Trash2, Copy, RefreshCw, ExternalLink, CheckCircle2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { ApiKey } from "@/lib/api";
import { exportCSV } from "@/lib/exportUtils";

export function ApiKeyManagerTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expiringKeys, setExpiringKeys] = useState<Array<{id: string; keyName: string; expiresAt: string}>>([]);

  useEffect(() => {
    if (!keys || keys.length === 0) { setExpiringKeys([]); return; }
    const soon: Array<{id: string; keyName: string; expiresAt: string}> = [];
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    for (const k of keys) {
      if (!k.createdAt) continue;
      const created = new Date(k.createdAt).getTime();
      const expiresAt = created + 365 * 24 * 60 * 60 * 1000;
      if (expiresAt > now && expiresAt - now < sevenDays) {
        soon.push({ id: k.id, keyName: k.name || k.id.slice(0, 8), expiresAt: new Date(expiresAt).toISOString() });
      }
    }
    setExpiringKeys(soon);
  }, [keys]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setKeys(await api.fetchApiKeys()); }
    catch (e) { setError(e instanceof Error ? e.message : "불러오기 실패"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const result = await api.createApiKey({ name: newKeyName.trim() });
      setCreatedKey(result.key);
      setNewKeyName("");
      await load();
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : "생성 실패");
    }
  };

  const handleDelete = async (id: string) => {
    try { await api.deleteApiKey(id); setToastMsg("삭제되었습니다"); await load(); }
    catch (e) { setToastMsg(e instanceof Error ? e.message : "삭제 실패"); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => setToastMsg("클립보드에 복사됨"));
  };

  return (
    <div className="space-y-4 pb-8">
      {expiringKeys.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-amber-700">⚠️ {expiringKeys.length}개 API 키가 곧 만료됩니다</p>
          <p className="text-[10px] text-amber-600/70 mt-0.5">7일 이내 만료 예정인 키를 확인하고 갱신하세요</p>
        </div>
      )}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-app-text">API 키 관리</h2>
          <p className="text-xs text-app-text-muted">발송 및 관리 자동화를 위한 API 키를 발급/관리합니다</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (keys.length > 0) exportCSV(["이름", "키(마스킹)", "상태", "플랜", "최대계정", "일일제한", "생성일"], keys.map(k => [k.name, k.maskedKey, k.isActive ? "활성" : "비활성", k.plan, String(k.maxAccounts), String(k.dailyLimit), k.createdAt]), "api-keys"); }}
            className="flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> 내보내기
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-lg bg-app-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors">
            <Plus className="h-3.5 w-3.5" /> 새 API 키
          </button>
        </div>
      </header>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={`apik-sk-${i}`} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted/10 p-4 text-sm text-app-danger">{error}</div>
      )}

      {!loading && !error && keys.length === 0 && (
        <EmptyState icon={Key} title="API 키가 없습니다" description="새 API 키를 생성하여 외부 시스템과 연동하세요.">
          <button onClick={() => setShowCreate(true)} className="mt-3 rounded-lg bg-app-primary px-4 py-2 text-xs font-medium text-white">키 생성</button>
        </EmptyState>
      )}

      {keys.length > 0 && (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-xl border border-app-border bg-app-card p-3 hover:border-app-border-strong transition-colors">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-app-text">{k.name}</span>
                  <Badge tone={k.isActive ? "success" : "neutral"}>{k.isActive ? "활성" : "비활성"}</Badge>
                  <Badge tone="info">{k.plan}</Badge>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-app-text-muted">{k.maskedKey}</p>
                <p className="text-[10px] text-app-text-subtle">
                  생성: {new Date(k.createdAt).toLocaleDateString("ko-KR")}
                  {k.lastUsed ? ` · 마지막 사용: ${new Date(k.lastUsed).toLocaleDateString("ko-KR")}` : ""}
                  {k.maxAccounts > 0 && ` · 최대 ${k.maxAccounts}계정`}
                  {k.dailyLimit > 0 && ` · 일 ${k.dailyLimit}건`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {k.isActive && (
                  <button onClick={() => handleDelete(k.id)}
                    className="rounded-lg p-1.5 text-app-text-subtle hover:text-app-danger hover:bg-app-danger-muted/30 transition-colors" title="삭제">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreatedKey(null); }} title="새 API 키 생성">
        {createdKey ? (
          <div className="space-y-3">
            <p className="text-xs text-app-text">API 키가 생성되었습니다. <strong>이 키는 다시 표시되지 않습니다.</strong></p>
            <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-bg p-2 font-mono text-xs break-all">
              <span className="flex-1 text-app-text">{createdKey}</span>
              <button onClick={() => copyKey(createdKey)}
                className="shrink-0 rounded-lg p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={() => { setShowCreate(false); setCreatedKey(null); }}
              className="w-full rounded-lg bg-app-primary py-2 text-xs font-medium text-white">확인</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-app-text">키 이름</label>
              <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="예: CI/CD 자동화, 외부 연동"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none focus:border-app-primary/60 focus-ring"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors">취소</button>
              <button onClick={handleCreate} disabled={!newKeyName.trim()}
                className="rounded-lg bg-app-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors">생성</button>
            </div>
          </div>
        )}
      </Modal>

      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-app-border bg-app-card px-4 py-2.5 shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-app-success" />
          <span className="text-xs text-app-text">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-app-text-muted hover:text-app-text">×</button>
        </div>
      )}
    </div>
  );
}
