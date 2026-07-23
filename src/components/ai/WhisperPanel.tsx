"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Pencil, History, Sparkles } from "lucide-react";
import type { WhisperData } from "@/types/ai-whisper";
import { cn } from "@/lib/cn";

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  vip: { bg: "bg-amber-500/15", text: "text-amber-400" },
  warning: { bg: "bg-red-500/15", text: "text-red-400" },
  urgent: { bg: "bg-red-600/20", text: "text-red-300" },
  info: { bg: "bg-blue-500/10", text: "text-blue-400" },
  language: { bg: "bg-purple-500/15", text: "text-purple-400" },
};

interface WhisperPanelProps {
  whisper?: WhisperData | null;
  loading?: boolean;
  dismissed?: boolean;
  onShow?: () => void;
  onSend: () => void;
  onEdit: (message: string) => void;
  onDismiss: () => void;
}

export function WhisperPanel({
  whisper,
  loading,
  dismissed,
  onShow,
  onSend,
  onEdit,
  onDismiss,
}: WhisperPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editingMessage, setEditingMessage] = useState(whisper?.suggestedReply ?? "");

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-app-border/60 bg-app-card/80 backdrop-blur-sm p-3"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-app-primary animate-pulse" />
          <span className="text-xs font-semibold text-app-text-muted">분석 중...</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded bg-app-border/40 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-app-border/40 animate-pulse" />
          <div className="mt-3 h-12 rounded-lg bg-app-border/30 animate-pulse" />
        </div>
      </motion.div>
    );
  }

  if (!whisper) return null;

  if (dismissed) {
    return (
      <button
        onClick={onShow}
        className="flex items-center gap-1.5 rounded-lg border border-app-border/40 bg-app-card/40 px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-primary hover:border-app-primary/30 transition-colors"
      >
        <History className="h-3 w-3" />
        <span>AI Whisper 히스토리</span>
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-app-border/60 bg-app-card/90 backdrop-blur-sm overflow-hidden shadow-lg"
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-app-border/30 bg-app-primary-muted/5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-app-primary" />
            <span className="text-xs font-semibold text-app-text">AI Whisper</span>
            {whisper.confidence > 0 && (
              <span className="text-[10px] text-app-text-subtle ml-0.5">
                {(whisper.confidence * 100).toFixed(0)}% 신뢰도
              </span>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="flex h-5 w-5 items-center justify-center rounded text-app-text-muted hover:text-app-text hover:bg-app-border/30 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="px-3.5 py-3 space-y-3">
          <div className="flex flex-wrap gap-1">
            {whisper.tags.map((tag, i) => {
              const color = TAG_COLORS[tag.type] || TAG_COLORS.info;
              return (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                    color.bg,
                    color.text,
                  )}
                >
                  {tag.type === "urgent" && "⚡ "}
                  {tag.label}
                </span>
              );
            })}
          </div>

          <p className="text-[11px] text-app-text-secondary leading-relaxed">
            {whisper.contextSummary}
          </p>

          <div className="rounded-lg border border-app-border/40 bg-app-bg/60 px-3 py-2.5">
            {editing ? (
              <textarea
                value={editingMessage}
                onChange={(e) => setEditingMessage(e.target.value)}
                className="w-full resize-none bg-transparent text-[11px] text-app-text focus:outline-none leading-relaxed"
                rows={3}
                autoFocus
              />
            ) : (
              <p className="text-[11px] text-app-text leading-relaxed whitespace-pre-wrap">
                {whisper.suggestedReply}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    onEdit(editingMessage);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-app-primary px-3 py-1.5 text-[11px] font-medium text-white hover:bg-app-primary/90 transition-colors"
                >
                  <Send className="h-3 w-3" />
                  보내기
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-1.5 text-[11px] text-app-text-muted hover:text-app-text transition-colors"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditingMessage(whisper.suggestedReply);
                    setEditing(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-app-border/60 px-3 py-1.5 text-[11px] font-medium text-app-text hover:bg-app-card-hover transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </button>
                <button
                  onClick={onSend}
                  className="flex items-center gap-1 rounded-lg bg-app-primary px-3 py-1.5 text-[11px] font-medium text-white hover:bg-app-primary/90 transition-colors"
                >
                  <Send className="h-3 w-3" />
                  보내기
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
