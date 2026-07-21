"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Zap, Globe, Sparkles, Scale, PenLine, Loader2, MessageSquare, Plus, X,
} from "lucide-react";

/**
 * AI Staff Cards — 메인 화면에 AI 직원 카드형 배치
 * 마케터 / 웹서치 / 무당(운세) / 법률 / 글쓰기 / 운영비서
 */
const AI_STAFF = [
  { id: "marketer", label: "마케터", icon: Zap, desc: "프로모션·광고 카피", color: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/20", textColor: "text-cyan-400" },
  { id: "websearch", label: "웹서치", icon: Globe, desc: "실시간 정보 검색·분석", color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/20", textColor: "text-blue-400" },
  { id: "fortune", label: "무당", icon: Sparkles, desc: "운세·타로·사주 분석", color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/20", textColor: "text-purple-400" },
  { id: "lawyer", label: "법률", icon: Scale, desc: "법률 검토·계약서 작성", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/20", textColor: "text-emerald-400" },
  { id: "writer", label: "글쓰기", icon: PenLine, desc: "블로그·SNS·보도자료", color: "from-rose-500/20 to-rose-500/5", border: "border-rose-500/20", textColor: "text-rose-400" },
  { id: "operator", label: "운영비서", icon: Bot, desc: "일정·작업·전체 운영", color: "from-[var(--color-accent)]/20 to-[var(--color-accent)]/5", border: "border-[var(--color-accent)]/20", textColor: "text-[var(--color-accent)]" },
];

const messages = [
  "프로모션 메일을 작성해주세요",
  "오늘 날씨 알려줘",
  "내일 운세 봐줘",
  "이 계약서 검토해줘",
  "인스타그램 게시글 써줘",
  "오늘 할 일 정리해줘",
];

export function AiStaffBoard() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
      {AI_STAFF.map((staff) => {
        const Icon = staff.icon;
        const isHovered = hovered === staff.id;
        return (
          <motion.button
            key={staff.id}
            onMouseEnter={() => setHovered(staff.id)}
            onMouseLeave={() => setHovered(null)}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`relative rounded-2xl border ${staff.border} bg-gradient-to-br ${staff.color} p-3.5 text-left transition-all overflow-hidden backdrop-blur-sm`}
            style={{
              background: isHovered
                ? `linear-gradient(135deg, ${staff.color.split(" ")[0].replace("/20", "/30")}, ${staff.color.split(" ")[1].replace("/5", "/10")})`
                : undefined,
            }}
          >
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-0">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 backdrop-blur-sm mb-2 ${staff.textColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-app-text">{staff.label}</p>
              <p className="text-[10px] text-app-text-muted mt-0.5">{staff.desc}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Floating AI Action Button — 우측 하단, 클릭 시 AI 메뉴
 */
export function FloatingAiButton() {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((p) => !p);

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-8">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-16 right-0 mb-2 w-56 space-y-1"
          >
            {[
              { label: "💬 AI 대화", id: "myai" as const },
              { label: "✍️ AI 발송", id: "aibroadcast" as const },
              { label: "🎨 콘텐츠", id: "contentstudio" as const },
              { label: "📊 분석", id: "aioperations" as const },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setOpen(false);
                  // Use setTimeout to let animation complete
                  setTimeout(() => {
                    const { useDashboardStore } = require("@/store/useDashboardStore");
                    useDashboardStore.getState().setActiveTab(item.id);
                  }, 200);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--color-accent)]/20 bg-app-card/90 backdrop-blur-xl px-3.5 py-2.5 text-xs font-medium text-app-text hover:bg-[var(--color-accent)]/10 transition-all shadow-lg"
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all"
        style={{
          background: "linear-gradient(135deg, var(--color-accent), #a08030)",
          boxShadow: "0 4px 20px rgba(212, 175, 55, 0.3)",
        }}
      >
        {open ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-white" />
        )}
      </motion.button>
    </div>
  );
}
