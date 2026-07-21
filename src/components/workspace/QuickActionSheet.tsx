"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, FileText, Bot, Search, Zap, X, BarChart3, RefreshCw, Clock3, Sparkles, AlertTriangle } from "lucide-react";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { TabId } from "@/types";
import type { Broadcast, DeliveryOverview } from "@/types";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Action {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tab: TabId;
  desc: string;
}

const QUICK_ACTIONS: Action[] = [
  { icon: Send, label: "새 발송", tab: "send", desc: "메시지 전송" },
  { icon: Users, label: "그룹 보기", tab: "group", desc: "참여 그룹" },
  { icon: Search, label: "그룹 검색", tab: "groupsearch", desc: "새 그룹 찾기" },
  { icon: Bot, label: "자동 응답", tab: "autoreply", desc: "규칙 설정" },
  { icon: Zap, label: "답장 매크로", tab: "replymacro", desc: "템플릿 발송" },
  { icon: FileText, label: "발송 기록", tab: "log", desc: "전송 로그" },
  { icon: BarChart3, label: "전달 분석", tab: "deliveryanalytics", desc: "도달률" },
  { icon: Bot, label: "AI 채팅", tab: "myai", desc: "AI 비서" },
];

export function QuickActionSheet() {
  const [open, setOpen] = useState(false);
  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [recentFailed, setRecentFailed] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const setSendMessage = useDashboardStore((s) => s.setSendMessage);
  const clearSendDraft = useDashboardStore((s) => s.clearSendDraft);
  const setReuseNotice = useDashboardStore((s) => s.setReuseNotice);
  const haptics = useHapticFeedback();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadSheetData() {
      setLoading(true);
      try {
        const [overviewData, logs] = await Promise.all([
          api.fetchDeliveryOverview(undefined, 1),
          api.fetchLogs({ status: "failed", limit: 8 } as never),
        ]);
        if (cancelled) return;
        setOverview(overviewData);
        setRecentFailed(logs.filter((log) => log.status === "failed").slice(0, 3));
      } catch {
        if (cancelled) return;
        setOverview(null);
        setRecentFailed([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSheetData();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const summaryLine = useMemo(() => {
    if (!overview?.summary) return "오늘 성과 데이터를 불러오는 중입니다.";
    const summary = overview.summary;
    return `성공률 ${summary.success_rate.toFixed(1)}% · 성공 ${summary.successful}건 · 실패 ${summary.failed}건`;
  }, [overview]);

  async function handleRetryFailed() {
    if (recentFailed.length === 0) {
      toast("error", "재시도할 실패 발송이 없습니다");
      return;
    }
    setRunningAction("retry");
    try {
      await api.batchRetryBroadcasts(recentFailed.map((item) => item.id));
      haptics.success();
      toast("success", "최근 실패 발송 재시도 시작", {
        description: `${recentFailed.length}건을 다시 큐에 넣었습니다.`,
      });
      setOpen(false);
      setActiveTab("log");
    } catch (err) {
      toast("error", "재시도 시작 실패", {
        description: err instanceof Error ? err.message : "잠시 후 다시 시도해주세요.",
      });
    } finally {
      setRunningAction(null);
    }
  }

  function jumpToQuickSend() {
    clearSendDraft();
    setSendMessage("");
    setReuseNotice("지금 바로 발송할 메시지를 작성하세요. 모바일 빠른 발송 모드입니다.");
    haptics.light();
    setActiveTab("send");
    setOpen(false);
  }

  function jumpToScheduledSend() {
    clearSendDraft();
    setReuseNotice("메시지를 작성한 뒤 예약 옵션에서 1시간 후 발송을 선택하세요.");
    haptics.light();
    setActiveTab("send");
    setOpen(false);
  }

  function jumpToAiRewrite() {
    haptics.light();
    setActiveTab("aibroadcast");
    setOpen(false);
  }

  return (
    <>        <button
          type="button"
          onClick={() => { haptics.light(); setOpen(true); }}
          className="flex flex-col items-center gap-0.5 flex-1 min-h-[48px] min-w-[48px] py-1 text-app-text-muted hover:text-app-text-secondary transition-colors relative"
          aria-label="퀵 액션"
        >
          <Zap className="h-5 w-5" />
          <span className="text-[10px] leading-none">퀵</span>
        </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-app-card border-t border-[var(--color-accent-border)] shadow-2xl pb-8 pt-2"
            >
              <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-app-border" />
              <div className="flex items-center justify-between px-5 py-2">
                <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                  모바일 퀵 액션
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-app-text-muted hover:bg-app-card-hover transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-px mx-5 bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent opacity-30" />
              <div className="px-5 pt-4 space-y-3">
                <div className="rounded-2xl border border-app-border/60 bg-app-bg/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-app-text">오늘 운영 브리프</p>
                      <p className="mt-1 text-[10px] text-app-text-muted">{loading ? "불러오는 중..." : summaryLine}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setActiveTab("deliveryanalytics"); setOpen(false); }}
                      className="rounded-xl border border-app-border px-2.5 py-1.5 text-[10px] text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
                    >
                      분석 열기
                    </button>
                  </div>
                  {recentFailed.length > 0 && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-app-danger/20 bg-app-danger/5 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-app-danger" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-app-text">최근 실패 {recentFailed.length}건</p>
                          <p className="truncate text-[10px] text-app-text-muted">{recentFailed[0]?.message}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetryFailed}
                        disabled={runningAction === "retry"}
                        className="shrink-0 rounded-xl bg-app-danger px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-60"
                      >
                        {runningAction === "retry" ? "재시도 중" : "3건 재시도"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={jumpToQuickSend}
                    className="group rounded-2xl border border-app-border/60 bg-app-bg/60 p-3 text-left transition-all hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-light)]"
                  >
                    <Send className="h-5 w-5 text-app-primary transition-transform group-hover:scale-110" />
                    <p className="mt-3 text-xs font-semibold text-app-text">즉시 발송 작성</p>
                    <p className="mt-1 text-[10px] text-app-text-muted">초안 비우고 바로 전송 준비</p>
                  </button>
                  <button
                    type="button"
                    onClick={jumpToScheduledSend}
                    className="group rounded-2xl border border-app-border/60 bg-app-bg/60 p-3 text-left transition-all hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-light)]"
                  >
                    <Clock3 className="h-5 w-5 text-app-info transition-transform group-hover:scale-110" />
                    <p className="mt-3 text-xs font-semibold text-app-text">1시간 뒤 예약</p>
                    <p className="mt-1 text-[10px] text-app-text-muted">예약 발송 플로우로 바로 이동</p>
                  </button>
                  <button
                    type="button"
                    onClick={jumpToAiRewrite}
                    className="group rounded-2xl border border-app-border/60 bg-app-bg/60 p-3 text-left transition-all hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-light)]"
                  >
                    <Sparkles className="h-5 w-5 text-app-warning transition-transform group-hover:scale-110" />
                    <p className="mt-3 text-xs font-semibold text-app-text">AI 문구 재작성</p>
                    <p className="mt-1 text-[10px] text-app-text-muted">모바일에서 빠르게 문구 개선</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { haptics.light(); setActiveTab("log"); setOpen(false); }}
                    className="group rounded-2xl border border-app-border/60 bg-app-bg/60 p-3 text-left transition-all hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-light)]"
                  >
                    <RefreshCw className="h-5 w-5 text-app-success transition-transform group-hover:scale-110" />
                    <p className="mt-3 text-xs font-semibold text-app-text">실패 로그 처리</p>
                    <p className="mt-1 text-[10px] text-app-text-muted">재시도, 취소, 삭제를 바로 처리</p>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.tab}
                      type="button"
                      onClick={() => { haptics.light(); setActiveTab(action.tab); setOpen(false); }}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-app-border/40 bg-app-bg/50 py-3 transition-all duration-200 hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-light)]"
                    >
                      <Icon className="h-5 w-5 text-app-primary transition-transform group-hover:scale-110" />
                      <span className="text-[10px] font-medium text-app-text">{action.label}</span>
                      <span className="text-[8px] text-app-text-muted">{action.desc}</span>
                    </button>
                  );
                })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
