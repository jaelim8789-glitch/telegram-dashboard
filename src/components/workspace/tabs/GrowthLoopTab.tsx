"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Loader2, CheckCircle2, AlertTriangle, Play,
  Pause, Trash2, Target, MessageSquare, BarChart3, Brain,
  RotateCw, Zap, Clock, ChevronRight,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getToken } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function authHeaders() {
  const token = getToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface CycleData {
  cycle_number: number;
  content_generated: string;
  sent_count: number;
  delivered_count: number;
  engagement_count: number;
  success_rate: number;
  analysis: string;
  suggestions: string[];
  next_steps: string[];
  timestamp: string;
}

interface GrowthLoop {
  id: string;
  goal: string;
  status: "idle" | "running" | "paused" | "completed" | "failed";
  current_cycle: number;
  strategy: Record<string, unknown>;
  metrics: { total_reached: number; total_engaged: number; avg_success_rate: number; cycles_completed: number };
  cycles: CycleData[];
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  idle: "대기", running: "실행 중", paused: "일시 중지", completed: "완료", failed: "실패",
};
const STATUS_COLORS: Record<string, string> = {
  idle: "bg-app-border", running: "bg-app-primary animate-pulse", paused: "bg-app-warning", completed: "bg-app-success", failed: "bg-app-danger",
};

export function GrowthLoopTab() {
  const [loops, setLoops] = useState<GrowthLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState("");
  const [channels, setChannels] = useState(5);
  const [intervalHours, setIntervalHours] = useState(6);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [pollTick, setPollTick] = useState(0);

  useEffect(() => { loadLoops(); }, []);
  useEffect(() => {
    const t = setInterval(() => { loadLoops(); }, 10000);
    return () => clearInterval(t);
  }, [loops.length]);

  async function loadLoops() {
    try {
      const res = await fetch(`${BASE}/api/growth-loop/status`, { headers: authHeaders() });
      if (res.ok) setLoops(await res.json());
    } catch {}
    finally { setLoading(false); }
  }

  async function startLoop() {
    if (!goal.trim() || starting) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/growth-loop/start`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ goal: goal.trim(), channel_count: channels, cycle_interval_hours: intervalHours }),
      });
      if (res.ok) {
        const loop = await res.json();
        setLoops((prev) => [loop, ...prev]);
        setGoal("");
      } else {
        const err = await res.json().catch(() => ({ detail: "시작 실패" }));
        setError(err.detail || "시작 실패");
      }
    } catch { setError("네트워크 오류"); }
    finally { setStarting(false); }
  }

  async function action(id: string, act: "pause" | "resume" | "delete") {
    setActioning(id);
    try {
      if (act === "delete") {
        await fetch(`${BASE}/api/growth-loop/${id}`, { method: "DELETE", headers: authHeaders() });
        setLoops((prev) => prev.filter((l) => l.id !== id));
      } else {
        const res = await fetch(`${BASE}/api/growth-loop/${id}/${act}`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ cycle_interval_hours: intervalHours }),
        });
        if (res.ok) {
          const updated = await res.json();
          setLoops((prev) => prev.map((l) => l.id === id ? updated : l));
        }
      }
    } catch {}
    finally { setActioning(null); }
  }

  const hasRunning = loops.some((l) => l.status === "running");
  const activeLoops = loops.filter((l) => l.status === "running" || l.status === "paused");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-primary/10">
          <TrendingUp className="h-5 w-5 text-app-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-app-text">자율 성장 루프</h2>
          <p className="text-[10px] text-app-text-muted">목표만 설정하면 AI가 자동으로 Analyze→Generate→Send→Repeat</p>
        </div>
      </div>

      {/* Start Panel */}
      <Panel title="🎯 새 성장 루프" className="border-app-primary/20">
        <div className="space-y-3">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="달성하고 싶은 목표를 입력하세요. 예: 회원 1000명 만들기, 일일 발송 50건 달성, 전환율 15% 만들기..."
            rows={3}
            disabled={starting}
            className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 resize-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-app-text-muted">채널</label>
              <input type="number" min={1} max={50} value={channels} onChange={(e) => setChannels(Number(e.target.value))}
                className="w-16 rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-xs outline-none focus:border-app-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-app-text-muted">간격(h)</label>
              <input type="number" min={1} max={72} value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))}
                className="w-16 rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-xs outline-none focus:border-app-primary" />
            </div>
          </div>
          <Button variant="primary" onClick={startLoop} loading={starting} disabled={!goal.trim() || starting} className="w-full">
            <Zap className="h-4 w-4" /> 자율 성장 시작하기
          </Button>
        </div>
      </Panel>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-app-danger/30 bg-app-danger-muted/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-app-danger" />
          <p className="text-xs text-app-danger">{error}</p>
        </div>
      )}

      {/* Active Loops */}
      {activeLoops.length > 0 && (
        <Panel title={`⚡ 활성 루프 (${activeLoops.length})`}>
          <div className="space-y-3">
            {activeLoops.map((loop) => (
              <LoopCard key={loop.id} loop={loop} actioning={actioning} onAction={action} />
            ))}
          </div>
        </Panel>
      )}

      {/* All Loops */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-app-text-muted py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
        </div>
      ) : loops.filter((l) => !activeLoops.includes(l)).length > 0 && (
        <Panel title="📋 이전 루프">
          <div className="space-y-3">
            {loops.filter((l) => !activeLoops.includes(l)).map((loop) => (
              <LoopCard key={loop.id} loop={loop} actioning={actioning} onAction={action} />
            ))}
          </div>
        </Panel>
      )}

      {!loading && loops.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-app-primary/5">
            <Brain className="h-10 w-10 text-app-primary/30" />
          </div>
          <p className="text-sm font-medium text-app-text">자율 성장 루프</p>
          <p className="text-xs text-app-text-muted max-w-xs">
            목표만 입력하면 AI가 자동으로<br />
            콘텐츠 생성 → 발송 → 분석 → 개선을 반복합니다
          </p>
        </div>
      )}
    </div>
  );
}

function LoopCard({ loop, actioning, onAction }: { loop: GrowthLoop; actioning: string | null; onAction: (id: string, act: "pause" | "resume" | "delete") => void }) {
  const [expanded, setExpanded] = useState(false);
  const m = loop.metrics || {};
  const latestCycle = loop.cycles[loop.cycles.length - 1];

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      loop.status === "running" ? "border-app-primary/30 bg-app-primary/5" :
      loop.status === "completed" ? "border-app-success/20 bg-app-success-muted/10" :
      loop.status === "failed" ? "border-app-danger/20 bg-app-danger-muted/10" :
      "border-app-border bg-app-card"
    )}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <div className="mt-1.5 shrink-0">
            <span className={cn("block h-2.5 w-2.5 rounded-full", STATUS_COLORS[loop.status])} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-app-text truncate">{loop.goal}</p>
              <span className="shrink-0 text-[10px] text-app-text-muted">
                {STATUS_LABELS[loop.status]}
              </span>
            </div>

            {/* Metrics row */}
            <div className="flex gap-3 mt-2 text-[10px]">
              <span className="text-app-text-muted">
                <span className="font-medium text-app-text">{m.cycles_completed || loop.current_cycle}</span> 사이클
              </span>
              <span className="text-app-text-muted">
                도달 <span className="font-medium text-app-text">{m.total_reached?.toLocaleString() || 0}</span>명
              </span>
              <span className="text-app-text-muted">
                성공률 <span className="font-medium text-app-success">{m.avg_success_rate || 0}%</span>
              </span>
            </div>

            {/* Latest cycle preview */}
            {latestCycle && (
              <div className="mt-2 rounded-lg border border-app-border/50 bg-app-bg/50 p-2">
                <p className="text-[9px] text-app-text-muted">최근 사이클 #{latestCycle.cycle_number}</p>
                <p className="text-[10px] text-app-text mt-0.5 line-clamp-2">{latestCycle.content_generated}</p>
                <div className="flex gap-2 mt-1 text-[9px] text-app-text-muted">
                  <span>{latestCycle.sent_count}건 발송</span>
                  <span>{latestCycle.success_rate}%</span>
                  <span>{latestCycle.engagement_count} 참여</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            {(loop.status === "running") && (
              <button onClick={() => onAction(loop.id, "pause")} disabled={actioning === loop.id}
                className="p-1.5 rounded-lg hover:bg-app-warning/10 text-app-warning transition-colors"
                title="일시 중지">
                {actioning === loop.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            )}
            {loop.status === "paused" && (
              <button onClick={() => onAction(loop.id, "resume")} disabled={actioning === loop.id}
                className="p-1.5 rounded-lg hover:bg-app-primary/10 text-app-primary transition-colors"
                title="재개">
                {actioning === loop.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-app-card-hover text-app-text-muted transition-colors" title="상세">
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
            </button>
            <button onClick={() => onAction(loop.id, "delete")} disabled={actioning === loop.id}
              className="p-1.5 rounded-lg hover:bg-app-danger/10 text-app-text-muted hover:text-app-danger transition-colors" title="삭제">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded cycles detail */}
      {expanded && loop.cycles.length > 0 && (
        <div className="border-t border-app-border px-3 py-2 space-y-2 max-h-60 overflow-y-auto">
          {loop.cycles.map((c) => (
            <div key={c.cycle_number} className="rounded-lg border border-app-border/50 bg-app-bg/30 p-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-app-text">사이클 #{c.cycle_number}</span>
                <span className={cn(c.success_rate >= 90 ? "text-app-success" : c.success_rate >= 70 ? "text-app-warning" : "text-app-danger")}>
                  {c.success_rate}%
                </span>
              </div>
              <p className="text-[10px] text-app-text-subtle mt-1 line-clamp-2">{c.content_generated}</p>
              {c.analysis && (
                <p className="text-[9px] text-app-text-muted mt-1">📊 {c.analysis}</p>
              )}
              {c.suggestions.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {c.suggestions.slice(0, 3).map((s, i) => (
                    <p key={i} className="text-[9px] text-app-text-muted ml-2">💡 {s}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
