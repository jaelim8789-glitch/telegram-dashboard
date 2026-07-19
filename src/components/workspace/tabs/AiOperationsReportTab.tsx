"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Sparkles, Loader2, FileText, Calendar, TrendingUp, Lightbulb } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

interface Report {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: string;
  created_at: string;
}

interface ReportSection {
  title?: string;
  content?: string;
}

type ReportInsight = string | { title?: string; description?: string; };

interface ReportRecommendation {
  title?: string;
  description?: string;
  impact?: "high" | "medium" | "low";
  suggested_action?: string;
}

interface ReportData {
  id?: string;
  report_id?: string;
  period_start: string;
  period_end: string;
  report_type: string;
  summary: string;
  sections?: ReportSection[];
  insights?: ReportInsight[];
  recommendations?: ReportRecommendation[];
}

export function AiOperationsReportTab() {
  const [reportType, setReportType] = useState("daily");
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  const listReports = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/operations-reports?limit=10");
      if (res.ok) setReports(await res.json());
    } catch {}
  }, []);

  useEffect(() => { listReports(); }, [listReports]);

  const generateReport = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setCurrentReport(null);

    try {
      const res = await fetch("/api/ai/operations-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: reportType,
          days,
          include_recommendations: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentReport(data);
        listReports();
      } else {
        const err = await res.json().catch(() => ({ detail: "오류 발생" }));
        setError(err.detail || "리포트 생성 실패");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const loadReport = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/operations-reports/${id}`);
      if (res.ok) setCurrentReport(await res.json());
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-app-primary" />
        <h2 className="text-sm font-bold text-app-text">AI Operations Report</h2>
        <Sparkles className="h-3.5 w-3.5 text-app-warning" />
        <span className="text-[10px] text-app-text-muted">운영 분석 리포트</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <Panel title="새 리포트 생성" className="shrink-0">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-app-text-muted">리포트 유형</label>
                <select value={reportType} onChange={e => { setReportType(e.target.value); setDays(e.target.value === "daily" ? 1 : e.target.value === "weekly" ? 7 : 30); }}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-primary">
                  <option value="daily">일간 리포트</option>
                  <option value="weekly">주간 리포트</option>
                  <option value="custom">맞춤 리포트</option>
                </select>
              </div>
              {reportType === "custom" && (
                <div>
                  <label className="text-[11px] font-medium text-app-text-muted">분석 기간 (일)</label>
                  <input type="number" value={days} onChange={e => setDays(Math.max(1, Math.min(90, Number(e.target.value))))}
                    className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-primary" />
                </div>
              )}
              <button onClick={generateReport} disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {loading ? "생성 중..." : "AI 리포트 생성"}
              </button>
              {error && <p className="text-xs text-app-danger">{error}</p>}
            </div>
          </Panel>

          <Panel title="이전 리포트" className="flex-1">
            <div className="space-y-1">
              {reports.length === 0 ? (
                <p className="text-xs text-app-text-muted text-center py-4">생성된 리포트가 없습니다</p>
              ) : (
                reports.map(r => (
                  <button key={r.id} onClick={() => loadReport(r.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      currentReport?.report_id === r.id
                        ? "bg-app-primary-muted text-app-primary font-medium"
                        : "text-app-text hover:bg-app-card-hover"
                    )}>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3" />
                      <span className="capitalize">{r.report_type} 리포트</span>
                    </div>
                    <p className="text-[10px] text-app-text-muted mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Panel>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3">
          {currentReport ? (
            <div className="space-y-4">
              <Panel title="📊 운영 요약">
                <div className="flex items-center gap-2 text-[11px] text-app-text-muted mb-3">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(currentReport.period_start).toLocaleDateString("ko-KR")} ~ {new Date(currentReport.period_end).toLocaleDateString("ko-KR")}</span>
                  <span className="ml-auto capitalize">{currentReport.report_type}</span>
                </div>
                <p className="text-xs text-app-text whitespace-pre-wrap leading-relaxed">{currentReport.summary}</p>
              </Panel>

              {(currentReport.sections?.length ?? 0) > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {currentReport.sections!.map((section: ReportSection, i: number) => (
                    <Panel key={i} title={section.title || `섹션 ${i + 1}`}>
                      <p className="text-xs text-app-text leading-relaxed whitespace-pre-wrap">
                        {section.content || JSON.stringify(section)}
                      </p>
                    </Panel>
                  ))}
                </div>
              )}

              {(currentReport.insights?.length ?? 0) > 0 && (
                <Panel title={<div className="flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-app-warning" /> 인사이트</div>}>
                  <div className="space-y-2">
                    {currentReport.insights!.map((insight: ReportInsight, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-app-border bg-app-bg p-2.5">
                        <Lightbulb className="h-4 w-4 text-app-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-app-text">                        {typeof insight === "string" ? insight : insight.title}</p>
                          {typeof insight !== "string" && insight.description && <p className="text-[11px] text-app-text-muted mt-0.5">{insight.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {(currentReport.recommendations?.length ?? 0) > 0 && (
                <Panel title={<div className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-app-primary" /> 개선 추천</div>}>
                  <div className="space-y-2">
                    {currentReport.recommendations!.map((rec: ReportRecommendation, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-app-border bg-app-bg p-2.5">
                        <div className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          rec.impact === "high" ? "bg-app-danger-muted text-app-danger" :
                          rec.impact === "medium" ? "bg-app-warning-muted text-app-warning" : "bg-app-info-muted text-app-info"
                        )}>{i + 1}</div>
                        <div>
                          <p className="text-xs font-medium text-app-text">{rec.title}</p>
                          {rec.description && <p className="text-[11px] text-app-text-muted mt-0.5">{rec.description}</p>}
                          {rec.suggested_action && (
                            <p className="text-[11px] text-app-primary mt-1">→ {rec.suggested_action}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <TrendingUp className="h-12 w-12 text-app-text-subtle mb-3" />
              <p className="text-sm font-medium text-app-text">AI 운영 리포트</p>
              <p className="text-xs text-app-text-muted mt-1">운영 데이터를 분석한 인사이트 리포트를 제공합니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}