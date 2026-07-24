"use client";

import { useState } from "react";
import {
  Zap, Loader2, CheckCircle2, AlertTriangle, Sparkles,
  Target, FileText, CalendarClock, Bot, ChevronRight,
  Brain, Send,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface StepState {
  step: string;
  status: string;
  detail: string | null;
  result: Record<string, unknown> | null;
}

interface Result {
  goal: string;
  plan: string[];
  steps: StepState[];
  summary: string | null;
  execution_time_ms: number;
}

const STEP_LABELS: Record<string, string> = {
  planner: "Í≥ÑÌöç ?òÎ¶Ω",
  targeting: "?ÄÍ≤?Î∂ÑÏÑù",
  content: "ÏΩòÌÖêÏ∏??ùÏÑ±",
  schedule: "?§Ï?Ï§??àÏïΩ",
  summary: "Í≤∞Í≥º ?îÏïΩ",
};

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  planner: Brain,
  targeting: Target,
  content: FileText,
  schedule: CalendarClock,
  summary: Sparkles,
};

export function OperatorTab() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);
  const account = accounts.find((a) => a.id === selectedAccountId);

  const [goal, setGoal] = useState("");
  const [channels, setChannels] = useState(3);
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function run() {
    if (!goal.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${BASE_URL}/api/operator/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken()
            ? { Authorization: `Bearer ${getToken()}` }
            : {}),
        },
        body: JSON.stringify({
          goal: goal.trim(),
          account_id: selectedAccountId || undefined,
          channels,
          dry_run: dryRun,
        }),
      });

      if (res.ok) {
        setResult(await res.json());
      } else {
        const err = await res.json().catch(() => ({ detail: "?§Î•ò Î∞úÏÉù" }));
        setError(err.detail || "?§Ìñâ ?§Ìå®");
      }
    } catch {
      setError("?§Ìä∏?åÌÅ¨ ?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.");
    } finally {
      setLoading(false);
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="h-4 w-4 text-app-success" />;
      case "failed": return <AlertTriangle className="h-4 w-4 text-app-danger" />;
      case "running": return <Loader2 className="h-4 w-4 animate-spin text-app-primary" />;
      default: return <span className="h-4 w-4 rounded-full border-2 border-app-border" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-primary/10">
          <Zap className="h-5 w-5 text-app-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-app-text">AI Operator</h2>
          <p className="text-[10px] text-app-text-muted">Î™©ÌëúÎß?ÎßêÌïòÎ©?AIÍ∞Ä ?åÏïÑ???¥ÏòÅ???§Ìñâ?©Îãà??/p>
        </div>
        {account && (
          <span className="ml-auto rounded-full bg-app-primary/10 px-2 py-0.5 text-[10px] font-medium text-app-primary">
            {account.name || account.phone?.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Input Panel */}
      <Panel title="?éØ ?¥ÏòÅ Î™©Ìëú" className="border-app-primary/20">
        <div className="space-y-3">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Î¨¥Ïóá???òÍ≥† ?∂Ïúº?†Í??? ?? Ï±ÑÎÑê 3Í∞??§ÏõåÏ§? ?§Îäò Î∞úÏÜ° ÏµúÏ†Å?îÌï¥Ï§? ?§Ìå®??Î∞úÏÜ° ?§Ïãú Î≥¥ÎÇ¥Ï§?.."
            rows={4}
            disabled={loading}
            className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 resize-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run();
              }
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-app-text-muted">Ï±ÑÎÑê ??/label>
              <input
                type="number"
                min={1}
                max={20}
                value={channels}
                onChange={(e) => setChannels(Math.max(1, Math.min(20, Number(e.target.value))))}
                disabled={loading}
                className="w-16 rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-xs text-app-text outline-none focus:border-app-primary"
              />
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-app-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-app-border"
              />
              ?åÏä§??Î™®Îìú (Í≥ÑÌöçÎß??ùÏÑ±)
            </label>
          </div>

          <Button
            variant="primary"
            onClick={run}
            loading={loading}
            disabled={!goal.trim() || loading}
            className="w-full"
          >
            <Zap className="h-4 w-4" />
            {loading ? "?§Ìñâ Ï§?.." : "?§Ìñâ?òÍ∏∞"}
          </Button>
        </div>
      </Panel>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-app-danger/30 bg-app-danger-muted/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-app-danger" />
          <p className="text-xs text-app-danger">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3 animate-scale-in">
          {/* Plan */}
          <Panel title="?ìã ?§Ìñâ Í≥ÑÌöç">
            <div className="space-y-2">
              {result.plan.map((p, i) => (
                <div key={`plan-${i}`} className="flex items-start gap-2 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-[10px] font-bold text-app-primary mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-app-text pt-0.5">{p}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Steps */}
          <Panel title="???§Ìñâ ?®Í≥Ñ">
            <div className="space-y-1.5">
              {result.steps.map((s, i) => {
                const Icon = STEP_ICONS[s.step] || ChevronRight;
                const label = STEP_LABELS[s.step] || s.step;
                return (
                  <div
                    key={`step-${i}`}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      s.status === "done"
                        ? "border-app-success/20 bg-app-success-muted/10"
                        : s.status === "failed"
                        ? "border-app-danger/20 bg-app-danger-muted/10"
                        : s.status === "running"
                        ? "border-app-primary/20 bg-app-primary-muted/10"
                        : "border-app-border bg-app-card-hover"
                    }`}
                  >
                    {statusIcon(s.status)}
                    <Icon className={`h-4 w-4 shrink-0 ${
                      s.status === "done" ? "text-app-success" :
                      s.status === "failed" ? "text-app-danger" :
                      "text-app-text-muted"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-app-text">{label}</p>
                      {s.detail && (
                        <p className="text-[10px] text-app-text-muted truncate">{s.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Generated Content */}
          {result.steps.find((s) => s.step === "content" && s.result?.message) && (
            <Panel title="?çÔ∏è ?ùÏÑ±??ÏΩòÌÖêÏ∏?>
              <div className="rounded-xl border border-app-border bg-app-bg p-4">
                <p className="text-xs text-app-text whitespace-pre-wrap">
                  {String(result.steps.find((s) => s.step === "content")!.result!.message)}
                </p>
                {(() => {
                  const contentStep = result.steps.find((s) => s.step === "content");
                  const hashtags = contentStep?.result?.hashtags as string[] | undefined;
                  return hashtags?.length ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hashtags.map((tag: string, i: number) => (
                        <span key={`tag-${i}`} className="text-[10px] text-app-primary">{tag}</span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const msg = String(result.steps.find((s) => s.step === "content")?.result?.message || "");
                    useDashboardStore.getState().setSendMessage(msg);
                    useDashboardStore.getState().setActiveTab("send");
                    // Draft???êÎèô ?Ä??
                    try { localStorage.setItem("telemon-draft-message", msg); } catch (e) { console.warn('Unhandled error in OperatorTab', e) }
                  }}
                >
                  <Send className="h-3.5 w-3.5" /> Î∞úÏÜ°??úºÎ°?Î≥¥ÎÇ¥Í∏?
                </Button>
              </div>
            </Panel>
          )}

          {/* Summary + Stats */}
          {result.summary && (
            <Panel title="?ìä Í≤∞Í≥º ?îÏïΩ">
              <div className="text-xs text-app-text whitespace-pre-wrap leading-relaxed">
                {result.summary}
              </div>
              <div className="mt-2 text-[10px] text-app-text-muted">
                ?§Ìñâ ?úÍ∞Ñ: {(result.execution_time_ms / 1000).toFixed(1)}Ï¥?
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-app-primary/5 mb-4">
            <Bot className="h-10 w-10 text-app-primary/30" />
          </div>
          <p className="text-sm font-medium text-app-text">AI Operator</p>
          <p className="text-xs text-app-text-muted mt-1 max-w-xs">
            Ï±ÑÎÑê ?±Ïû•, Î∞úÏÜ° ÏµúÏ†Å?? ÏΩòÌÖêÏ∏??úÏûë ??br />
            ?¥ÏòÅ Î™©ÌëúÎ•??êÏó∞?¥Î°ú ?ÖÎ†•?òÎ©¥ AIÍ∞Ä ?êÎèô?ºÎ°ú ?§Ìñâ?©Îãà??
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {[
              "Ï±ÑÎÑê 3Í∞??§ÏõåÏ§?,
              "?§Îäò Î∞úÏÜ° ÏµúÏ†Å?îÌï¥Ï§?,
              "?§Ìå®??Î∞úÏÜ° Î∂ÑÏÑù?òÍ≥† ?§Ïãú Î≥¥ÎÇ¥Ï§?,
              "Ï£ºÍ∞Ñ ÎßàÏ???Í≥ÑÌöç ?∏ÏõåÏ§?,
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => { setGoal(suggestion); setTimeout(run, 100); }}
                className="rounded-full border border-app-border/60 bg-app-card-hover px-3 py-1.5 text-[11px] text-app-text-muted hover:border-app-primary/30 hover:text-app-primary transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
