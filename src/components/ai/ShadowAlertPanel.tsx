"use client";

import { useState } from "react";
import { AlertTriangle, Send, X, Edit3, RefreshCw, Clock, User } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ShadowAlert } from "@/hooks/useAiShadow";

const INTENT_LABELS: Record<string, string> = {
  price_inquiry: "가격 문의",
  complaint: "불만/항의",
  greeting: "인사",
  reservation: "예약 문의",
  general: "일반 문의",
};

interface ShadowAlertPanelProps {
  alerts: ShadowAlert[];
  onSend: (alert: ShadowAlert, editedMessage?: string) => void;
  onDismiss: (alertId: string) => void;
  onRegenerate: (alert: ShadowAlert) => void;
}

export function ShadowAlertPanel({ alerts, onSend, onDismiss, onRegenerate }: ShadowAlertPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-app-text-muted px-4">
        <Clock className="h-8 w-8 opacity-30" />
        <p className="text-xs">감시 중인 대화가 없습니다</p>
        <p className="text-[10px]">고객 메시지가 도착하면 여기에 표시됩니다</p>
      </div>
    );
  }

  const startEditing = (alert: ShadowAlert) => {
    setEditingId(alert.id);
    setEditText(alert.suggestedReply);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const confirmEdit = (alert: ShadowAlert) => {
    onSend(alert, editText.trim() || alert.suggestedReply);
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-app-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-app-text">
            Shadow 알림
          </span>
          <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            {alerts.length}개
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-2 p-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden"
            >
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                      <User className="h-3 w-3 text-amber-400" />
                    </div>
                    <span className="text-xs font-medium text-app-text truncate">
                      {alert.customerName}
                    </span>
                  </div>
                  <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    {alert.elapsedMinutes}분 경과
                  </span>
                </div>

                <div className="rounded-lg bg-app-card px-2.5 py-1.5">
                  <p className="text-[10px] font-medium text-app-text-muted mb-0.5">
                    고객 메시지
                  </p>
                  <p className="text-xs text-app-text line-clamp-2">
                    {alert.customerMessage}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-medium",
                      alert.detectedIntent === "complaint" ? "bg-red-500/10 text-red-400" :
                      alert.detectedIntent === "price_inquiry" ? "bg-blue-500/10 text-blue-400" :
                      "bg-violet-500/10 text-violet-400"
                    )}>
                      {INTENT_LABELS[alert.detectedIntent] || alert.detectedIntent}
                    </span>
                    {alert.confidence > 0.7 && (
                      <span className="text-[9px] text-green-400 font-medium">높은 신뢰도</span>
                    )}
                  </div>
                </div>

                {editingId === alert.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full rounded-lg border border-app-border bg-app-card px-2.5 py-2 text-xs text-app-text resize-none focus:outline-none focus:border-app-primary/50 min-h-[72px]"
                      autoFocus
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-lg border border-app-border px-2.5 py-1 text-[10px] text-app-text-muted hover:bg-app-card-hover transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmEdit(alert)}
                        className="rounded-lg bg-app-primary px-2.5 py-1 text-[10px] text-white hover:opacity-90 transition-opacity"
                      >
                        확인
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-app-card-hover px-2.5 py-2">
                    <p className="text-[10px] font-medium text-app-text-muted mb-0.5">
                      AI 제안 답장
                    </p>
                    <p className="text-xs text-app-text leading-relaxed whitespace-pre-wrap">
                      {alert.suggestedReply}
                    </p>
                  </div>
                )}
              </div>

              {editingId !== alert.id && (
                <div className="flex border-t border-amber-500/10 divide-x divide-amber-500/10">
                  <button
                    type="button"
                    onClick={() => startEditing(alert)}
                    className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    수정하기
                  </button>
                  <button
                    type="button"
                    onClick={() => onSend(alert)}
                    className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-app-primary hover:bg-app-primary/5 transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    보내기
                  </button>
                  <button
                    type="button"
                    onClick={() => onRegenerate(alert)}
                    className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    재생성
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(alert.id)}
                    className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-app-danger-muted hover:text-app-danger hover:bg-app-danger/5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    무시
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
