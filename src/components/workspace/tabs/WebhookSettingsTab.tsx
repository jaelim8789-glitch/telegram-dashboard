"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Globe, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";

interface WebhookSettingsTabProps {
  tenantId?: string;
}

export function WebhookSettingsTab({ tenantId }: WebhookSettingsTabProps) {
  const { toast } = useToast();
  const [urls, setUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "failed" | null>>({});

  const tid = tenantId ?? "";

  const load = useCallback(async () => {
    if (!tid) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await api.request<{ urls: string[] }>(`/api/webhook-settings/${tid}`);
      setUrls(result.urls ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "웹훅 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [tid]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!tid) return;
    setSaving(true);
    setError(null);
    try {
      await api.request(`/api/webhook-settings/${tid}`, {
        method: "PUT",
        body: JSON.stringify({ urls }),
      });
      toast("success", "웹훅 URL이 저장되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(url: string) {
    if (!tid) return;
    setTesting(url);
    setTestResults((prev) => ({ ...prev, [url]: null }));
    try {
      const result = await api.request<{ status: string }>(`/api/webhook-settings/${tid}/test`, {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setTestResults((prev) => ({ ...prev, [url]: result.status === "delivered" ? "success" : "failed" }));
      if (result.status === "delivered") {
        toast("success", "웹훅 테스트가 전송되었습니다.");
      } else {
        toast("error", "웹훅 전송에 실패했습니다. URL을 확인하세요.");
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [url]: "failed" }));
      toast("error", "웹훅 테스트에 실패했습니다.");
    } finally {
      setTesting(null);
    }
  }

  function handleAdd() {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
      toast("error", "URL은 http:// 또는 https://로 시작해야 합니다.");
      return;
    }
    if (urls.includes(trimmed)) {
      toast("error", "이미 등록된 URL입니다.");
      return;
    }
    setUrls((prev) => [...prev, trimmed]);
    setNewUrl("");
  }

  function handleRemove(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[urls[index]];
      return next;
    });
  }

  if (loading) {
    return (
      <Panel title="웹훅 알림">
        <div className="flex items-center gap-2 py-4 text-sm text-app-text-muted">
          <RefreshCw className="h-4 w-4 animate-spin" /> 불러오는 중...
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <Panel
        title={
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-app-primary" />
            웹훅 알림 설정
          </div>
        }
        description="발송 완료, 계정 상태 변경 등 이벤트를 HTTP POST로 전달받습니다."
      >
        {/* URL List */}
        <div className="space-y-2">
          {urls.length === 0 && !loading && (
            <EmptyState icon={Globe} title="등록된 웹훅 URL이 없습니다" description="아래에 URL을 추가하세요." />
          )}
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card/50 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-mono text-app-text">{url}</p>
              </div>
              {testResults[url] === "success" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-app-success" />
              )}
              {testResults[url] === "failed" && (
                <XCircle className="h-4 w-4 shrink-0 text-app-danger" />
              )}
              <button
                type="button"
                onClick={() => handleTest(url)}
                disabled={testing === url}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors disabled:opacity-50"
                title="테스트 전송"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", testing === url && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-app-danger hover:bg-app-danger-muted transition-colors"
                title="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add URL */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="https://hooks.slack.com/services/..."
            className="flex-1 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none placeholder:text-app-text-subtle focus:border-app-primary/60 transition-colors"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newUrl.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary text-white hover:bg-app-primary-hover transition-colors disabled:opacity-50"
            title="URL 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Save / Info */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-[11px] text-app-text-muted">
            <p>Slack, Discord, 또는 자체 서버 엔드포인트를 설정하세요.</p>
            <p className="mt-0.5">
              지원 이벤트: 발송 완료, 발송 실패, 계정 인증 만료, 계정 차단, 자동응답 트리거
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>

        {error && <InlineError className="mt-3">{error}</InlineError>}
      </Panel>

      {/* Event Reference */}
      <Panel title="웹훅 이벤트 참조" description="전송되는 POST body 구조">
        <div className="space-y-3 text-xs">
          <div className="rounded-xl border border-app-border bg-app-card/50 p-3">
            <pre className="whitespace-pre-wrap break-words text-[11px] text-app-text-muted font-mono">
{`{
  "event": "broadcast.completed",
  "timestamp": "2026-07-17T10:30:00Z",
  "tenant_id": "...",
  "data": {
    "broadcast_id": "...",
    "message_preview": "...",
    "success_count": 10,
    "failure_count": 0,
    "total_recipients": 10,
    "status": "completed"
  }
}`}
            </pre>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-app-border bg-app-card/50 p-2.5">
              <p className="font-medium text-app-text mb-1">broadcast.completed</p>
              <p className="text-app-text-muted">발송 완료 (일부 실패 포함)</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card/50 p-2.5">
              <p className="font-medium text-app-text mb-1">broadcast.failed</p>
              <p className="text-app-text-muted">발송 전체 실패</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card/50 p-2.5">
              <p className="font-medium text-app-text mb-1">account.unauthorized</p>
              <p className="text-app-text-muted">계정 세션 만료</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card/50 p-2.5">
              <p className="font-medium text-app-text mb-1">account.banned</p>
              <p className="text-app-text-muted">계정 차단</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card/50 p-2.5">
              <p className="font-medium text-app-text mb-1">auto_reply.triggered</p>
              <p className="text-app-text-muted">자동응답 실행</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-card/50 p-2.5">
              <p className="font-medium text-app-text mb-1">macro.sent</p>
              <p className="text-app-text-muted">답장매크로 발송</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
