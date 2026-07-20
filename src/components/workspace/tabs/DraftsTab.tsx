"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, CheckCircle2, XCircle, Clock, Send, Trash2, Eye, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import * as draftApi from "@/lib/draft-api";

const STATUS_OPTIONS = [
  { value: "", label: "전체", icon: FileText },
  { value: "draft", label: "대기", icon: Clock },
  { value: "approved", label: "승인됨", icon: CheckCircle2 },
  { value: "rejected", label: "거절됨", icon: XCircle },
  { value: "scheduled", label: "예약됨", icon: Send },
];

export function DraftsTab() {
  const [drafts, setDrafts] = useState<draftApi.Draft[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<draftApi.DraftSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        draftApi.fetchDrafts(status || undefined),
        draftApi.fetchDraftSummary(),
      ]);
      setDrafts(d);
      setSummary(s);
    } catch { /* ignore */ }
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) { await draftApi.approveDraft(id); load(); }
  async function handleReject(id: string) { await draftApi.rejectDraft(id); load(); }
  async function handleDelete(id: string) { await draftApi.deleteDraft(id); load(); }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-app-primary" />
        <h2 className="text-base font-semibold text-app-text">AI Draft 관리</h2>
        <span className="text-xs text-app-text-muted">검토 후 승인/거절</span>
        <button onClick={load} className="ml-auto p-1.5 rounded-lg hover:bg-app-card-hover"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {summary && (
        <div className="flex gap-2 text-xs flex-wrap">
          {[{ label: "대기", v: summary.draft }, { label: "승인", v: summary.approved },
            { label: "거절", v: summary.rejected }, { label: "예약", v: summary.scheduled }].map(s => (
            <span key={s.label} className="rounded-lg bg-app-card border border-app-border px-2.5 py-1">
              {s.label} <strong>{s.v}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto">
        {STATUS_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setStatus(o.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              status === o.value ? "bg-app-primary text-white" : "bg-app-card border border-app-border text-app-text-muted hover:bg-app-card-hover"
            }`}>
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-app-primary" /></div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-app-text-muted gap-2">
          <FileText className="h-8 w-8 opacity-30" />
          <p className="text-xs">아직 Draft가 없습니다. AI 콘텐츠 스튜디오에서 생성하세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map(d => (
            <div key={d.id} className="rounded-lg border border-app-border bg-app-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      d.status === "draft" ? "bg-amber-500/10 text-amber-600" :
                      d.status === "approved" ? "bg-emerald-500/10 text-emerald-600" :
                      d.status === "rejected" ? "bg-red-500/10 text-red-600" :
                      "bg-blue-500/10 text-blue-600"
                    }`}>{d.status}</span>
                    <span className="text-xs font-medium text-app-text truncate">{d.title || "제목 없음"}</span>
                    <span className="text-[10px] text-app-text-muted">{d.content_type}</span>
                  </div>
                  <p className="text-xs text-app-text-secondary line-clamp-2">{d.content}</p>
                  <p className="text-[10px] text-app-text-muted mt-1">{new Date(d.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {d.status === "draft" && <>
                    <button onClick={() => handleApprove(d.id)} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10" title="승인"><CheckCircle2 className="h-4 w-4" /></button>
                    <button onClick={() => handleReject(d.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10" title="거절"><XCircle className="h-4 w-4" /></button>
                  </>}
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg text-app-text-muted hover:bg-app-card-hover" title="삭제"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
