"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Zap, Globe, Sparkles, Scale, PenLine, X, ChevronRight,
} from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";

/**
 * AI Staff Cards — 카드형 AI 직원 + 실시간 상태 + 인라인 전환
 */

interface StaffMember {
  id: string; label: string; icon: React.ComponentType<{ className?: string }>;
  desc: string; status: string; color: string; border: string; textColor: string;
}

const AI_STAFF: StaffMember[] = [
  { id: "marketer", label: "마케터", icon: Zap, desc: "프로모션·광고 카피", status: "", color: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/20", textColor: "text-cyan-400" },
  { id: "websearch", label: "웹서치", icon: Globe, desc: "실시간 정보 검색", status: "분석 중...", color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/20", textColor: "text-blue-400" },
  { id: "fortune", label: "무당", icon: Sparkles, desc: "운세·타로·사주", status: "", color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/20", textColor: "text-purple-400" },
  { id: "lawyer", label: "법률", icon: Scale, desc: "법률 검토·계약서", status: "", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/20", textColor: "text-emerald-400" },
  { id: "writer", label: "글쓰기", icon: PenLine, desc: "블로그·SNS·보도자료", status: "글감 수집 중...", color: "from-rose-500/20 to-rose-500/5", border: "border-rose-500/20", textColor: "text-rose-400" },
  { id: "ai", label: "운영비서", icon: Bot, desc: "일정·작업·전체 운영", status: "발송 분석 중...", color: "from-[var(--color-accent)]/20 to-[var(--color-accent)]/5", border: "border-[var(--color-accent)]/20", textColor: "text-[var(--color-accent)]" },
];

const STATUSES: Record<string, string> = {
  marketer: "캠페인 분석 중...",
  websearch: "실시간 검색 중...",
  fortune: "운세 해석 중...",
  lawyer: "계약서 검토 중...",
  writer: "글감 수집 중...",
  ai: "발송 분석 중...",
};

const statusTimers: Record<string, number> = {};
const STATUS_INTERVAL = 4000; // rotate every 4 seconds for demo

export function AiStaffBoard() {
  const [hovered, setHovered] = useState<string | null>(null);
  const setSendMessage = useDashboardStore((s) => s.setSendMessage);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const [chatting, setChatting] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>(STATUSES);

  // Rotate statuses for demo effect
  useEffect(() => {
    const t = setInterval(() => {
      setStatuses((prev) => {
        const next = { ...prev };
        const keys = Object.keys(next);
        const activeKey = keys[Math.floor(Math.random() * keys.length)];
        const actions = ["분석 중...", "처리 중...", "대기 중", "학습 중...", "최적화 중..."];
        next[activeKey] = actions[Math.floor(Math.random() * actions.length)];
        return next;
      });
    }, STATUS_INTERVAL);
    return () => clearInterval(t);
  }, []);

  function handleStaffClick(staff: StaffMember) {
    setSendMessage(staff.label + "님, 도움이 필요합니다");
    setActiveTab("myai");
  }

  const staffWithStatus = AI_STAFF.map((s) => ({ ...s, status: statuses[s.id] || s.status }));

  return (
    <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-thin [-webkit-overflow-scrolling:touch] pb-1" style={{ scrollbarWidth: "thin" }}>
      {staffWithStatus.map((staff) => {
        const Icon = staff.icon;
        const isHovered = hovered === staff.id;
        return (
          <motion.button
            key={staff.id}
            onMouseEnter={() => setHovered(staff.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleStaffClick(staff)}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className={`relative rounded-2xl border ${staff.border} bg-gradient-to-br ${staff.color} p-3.5 text-left transition-all overflow-hidden backdrop-blur-sm gradient-border snap-start shrink-0 w-[160px] md:w-auto`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-0">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 backdrop-blur-sm mb-2 ${staff.textColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-app-text">{staff.label}</p>
              <p className="text-[10px] text-app-text-muted mt-0.5">{staff.desc}</p>
              {/* Real-time status */}
              {staff.status && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-app-success animate-pulse" />
                  <span className="text-[9px] text-app-text-muted truncate">{staff.status}</span>
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Floating AI Action Button — 우측 하단, 골드 글로우
 */
export function FloatingAiButton() {
  const [open, setOpen] = useState(false);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const toggle = () => setOpen((p) => !p);

  const actions = [
    { label: "💬 AI 대화", tab: "myai" as const },
    { label: "✍️ AI 발송", tab: "aibroadcast" as const },
    { label: "📊 분석", tab: "aioperations" as const },
  ];

  return (
    <div className="fixed bottom-28 right-4 z-[55] md:bottom-20">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-16 right-0 mb-2 w-48 space-y-1"
          >
            {actions.map((item) => (
              <motion.button
                key={item.tab}
                whileHover={{ x: 4 }}
                onClick={() => { setOpen(false); setActiveTab(item.tab); }}
                className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--color-accent)]/20 bg-app-card/90 backdrop-blur-xl px-3.5 py-2.5 text-xs font-medium text-app-text hover:bg-[var(--color-accent)]/10 transition-all shadow-lg"
              >
                <span>{item.label}</span>
                <ChevronRight className="h-3 w-3 ml-auto text-[var(--color-accent)]" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-12 w-12 items-center justify-center rounded-full accent-glow-ring"
        style={{
          background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
        }}
      >
        {open ? <X className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
      </motion.button>
    </div>
  );
}
