"use client";

import { useState, useEffect, useCallback } from "react";
import { Workflow, Plus, ToggleLeft, ToggleRight, Trash2, Loader2, RefreshCw } from "lucide-react";
import * as triggerApi from "@/lib/trigger-api";

export function TriggersTab() {
  const [rules, setRules] = useState<triggerApi.TriggerRule[]>([]);
  const [stats, setStats] = useState<triggerApi.TriggerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([triggerApi.fetchRules(), triggerApi.fetchTriggerStats()]);
      setRules(r); setStats(s);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(id: string) { await triggerApi.toggleRule(id); load(); }
  async function handleDelete(id: string) { await triggerApi.deleteRule(id); load(); }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Workflow className="h-5 w-5 text-app-primary" />
        <h2 className="text-base font-semibold text-app-text">자동화 규칙</h2>
        <span className="text-xs text-app-text-muted">트리거 → 액션</span>
        <button onClick={load} className="ml-auto p-1.5 rounded-lg hover:bg-app-card-hover"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {stats && (
        <div className="flex gap-2 text-xs">
          <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1">전체 <strong>{stats.total_rules}</strong></span>
          <span className="rounded-lg bg-app-card border border-app-border px-2.5 py-1">활성 <strong>{stats.active_rules}</strong></span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-app-primary" /></div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-app-text-muted gap-2">
          <Workflow className="h-8 w-8 opacity-30" />
          <p className="text-xs">아직 등록된 규칙이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className="rounded-lg border border-app-border bg-app-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${r.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-500/10 text-gray-500"}`}>
                      {r.is_active ? "활성" : "비활성"}
                    </span>
                    <span className="text-xs font-medium text-app-text">{r.name}</span>
                    <span className="text-[10px] text-app-text-muted">{r.trigger_type}</span>
                  </div>
                  <p className="text-xs text-app-text-secondary mt-0.5">{r.description || `${r.actions?.length || 0}개 액션`}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleToggle(r.id)} className="p-1.5 rounded-lg text-app-text-muted hover:bg-app-card-hover">
                    {r.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
