"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, FileText, Bot, Search, Zap, X, BarChart3 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { TabId } from "@/types";

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
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-0.5 flex-1 py-1.5 text-app-text-muted"
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
                  퀵 액션
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
              <div className="grid grid-cols-4 gap-2 px-5 pt-4">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.tab}
                      type="button"
                      onClick={() => { setActiveTab(action.tab); setOpen(false); }}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-app-border/40 bg-app-bg/50 py-3 transition-all duration-200 hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-light)]"
                    >
                      <Icon className="h-5 w-5 text-app-primary transition-transform group-hover:scale-110" />
                      <span className="text-[10px] font-medium text-app-text">{action.label}</span>
                      <span className="text-[8px] text-app-text-muted">{action.desc}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
