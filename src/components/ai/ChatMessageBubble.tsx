"use client";

import { useState } from "react";
import { Loader2, Send, Calendar, Search, BarChart3, Settings, CheckCircle, XCircle } from "lucide-react";
import type { AgentMessage } from "@/lib/agent-api";

interface ChatMessageBubbleProps {
  message: AgentMessage;
  onExecuteTool?: (messageId: string, toolName: string, payload: Record<string, unknown>) => Promise<void>;
}

const TOOL_BUTTONS: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  send_message: {
    label: "\uD83D\uDCE8 발송",
    icon: <Send className="h-3.5 w-3.5" />,
    color: "border-app-primary/30 text-app-primary hover:bg-app-primary/10",
  },
  schedule_message: {
    label: "\uD83D\uDCC5 예약",
    icon: <Calendar className="h-3.5 w-3.5" />,
    color: "border-amber-500/30 text-amber-500 hover:bg-amber-500/10",
  },
  web_search: {
    label: "\uD83D\uDD0D 검색",
    icon: <Search className="h-3.5 w-3.5" />,
    color: "border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10",
  },
  analyze: {
    label: "\uD83D\uDCCA 분석",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    color: "border-violet-500/30 text-violet-500 hover:bg-violet-500/10",
  },
  auto_reply_config: {
    label: "\u2699\uFE0F 적용",
    icon: <Settings className="h-3.5 w-3.5" />,
    color: "border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10",
  },
};

export function ChatMessageBubble({ message, onExecuteTool }: ChatMessageBubbleProps) {
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<string | null>(null);

  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool) {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="flex items-center gap-2 rounded-lg bg-app-card-hover px-3 py-1.5 text-xs text-app-text-muted">
          <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  async function handleExecute(toolName: string, payload: Record<string, unknown>) {
    if (!onExecuteTool || executing) return;
    setExecuting(toolName);
    setExecResult(null);
    try {
      await onExecuteTool(message.id, toolName, payload);
      setExecResult("success");
    } catch {
      setExecResult("error");
    } finally {
      setExecuting(null);
      setTimeout(() => setExecResult(null), 3000);
    }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${isUser ? "items-end" : "items-start"}`}>
        {/* Agent name header */}
        {!isUser && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-xs font-medium text-app-text-muted">Agent</span>
            {message.tokensUsed > 0 && (
              <span className="text-[10px] text-app-text-muted/60">{message.tokensUsed}t</span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-app-primary text-white rounded-br-md"
              : "bg-app-card-hover text-app-text rounded-bl-md border border-app-border"
          }`}
        >
          {message.content}
        </div>

        {/* Tool execution buttons (agent messages only) */}
        {!isUser && message.toolName && message.toolButtonLabel && (
          <div className="flex flex-wrap gap-1.5 px-1">
            <button
              onClick={() =>
                handleExecute(message.toolName!, message.toolPayload || {})
              }
              disabled={executing !== null}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 ${
                TOOL_BUTTONS[message.toolName]?.color || "border-app-border text-app-text-muted hover:bg-app-card-hover"
              } ${executing === message.toolName ? "opacity-50 pointer-events-none" : ""}`}
            >
              {executing === message.toolName ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : execResult === "success" ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              ) : execResult === "error" ? (
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              ) : (
                TOOL_BUTTONS[message.toolName]?.icon || <Send className="h-3.5 w-3.5" />
              )}
              {execResult === "success" ? "완료" : execResult === "error" ? "실패" : message.toolButtonLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
