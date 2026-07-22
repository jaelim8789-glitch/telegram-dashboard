"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { MarkdownMessage } from "@/components/ai/MarkdownMessage";
import OneClickBusinessModal from "@/components/business/OneClickBusinessModal";

/**
 * AI Welcome Card — "안녕하세요 대표님, 오늘 할일"
 * Works only with existing API, no new backend calls.
 */
export function AiWelcomeCard() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const [stats, setStats] = useState({ today: 0, failed: 0, pending: 0, sent: 0 });
  const [name, setName] = useState("대표님");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "안녕하세요" : hour < 18 ? "안녕하세요" : "안녕하세요";

  // Use store state for the One Click Business modal
  const showBusinessModal = useDashboardStore((state) => state.showBusinessModal);
  const setShowBusinessModal = useDashboardStore((state) => state.setShowBusinessModal);

  useEffect(() => {
    if (account) setName(account.name || account.phone?.slice(0, 6) || "대표님");
    api.fetchLogs({ days: 1 }).then((logs) => {
      setStats({
        today: logs.length,
        sent: logs.filter((l) => l.status === "sent").length,
        failed: logs.filter((l) => l.status === "failed").length,
        pending: logs.filter((l) => l.status === "pending").length,
      });
    }).catch((e) => console.error("[AiWelcomeCard] fetchLogs 실패", e));
  }, [selectedAccountId]);

  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const setSendMessage = useDashboardStore((s) => s.setSendMessage);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 rounded-2xl border border-[var(--color-accent)]/20 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent p-4"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
            <Bot className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-app-text font-serif">
              {greeting}, {name}
            </h2>
            <p className="text-xs text-app-text-muted mt-0.5">
              오늘은{" "}
              <span className="text-app-text font-medium">{stats.today}건</span>의 발송이 있습니다
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
            {stats.pending > 0 ? `${stats.pending}건 진행 중` : "모두 완료"}
          </span>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setActiveTab("send")}
            className="flex-1 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/5 p-2.5 text-left hover:bg-[var(--color-accent)]/10 transition-colors">
            <p className="text-[10px] text-app-text-muted">답장 필요</p>
            <p className="text-base font-bold text-app-text">{stats.pending}</p>
          </button>
          <button onClick={() => setActiveTab("scheduler")}
            className="flex-1 rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/5 p-2.5 text-left hover:bg-[var(--color-accent)]/10 transition-colors">
            <p className="text-[10px] text-app-text-muted">예약</p>
            <p className="text-base font-bold text-app-text">{stats.pending}</p>
          </button>
          <button onClick={() => setActiveTab("send")}
            className="flex-1 rounded-xl border border-app-danger/15 bg-app-danger/5 p-2.5 text-left hover:bg-app-danger/10 transition-colors">
            <p className="text-[10px] text-app-text-muted">실패</p>
            <p className="text-base font-bold text-app-danger">{stats.failed}</p>
          </button>
        </div>

        {/* AI Suggestion chip */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "📊 오늘 리포트", action: () => setSendMessage("오늘 발송 현황 요약해줘") },
            { label: "✍️ 새 발송", action: () => setActiveTab("send") },
            { label: "🤖 AI 도움", action: () => {} },
            { label: "💼 비즈니스 시작하기", action: () => setShowBusinessModal(true) },
          ].map((chip) => (
            <button key={chip.label} onClick={chip.action}
              className="rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-3 py-1 text-[11px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* One Click Business Modal - controlled by store */}
      <OneClickBusinessModal />
    </>
  );
}