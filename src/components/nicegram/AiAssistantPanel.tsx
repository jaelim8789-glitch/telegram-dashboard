"use client";

/**
 * AiAssistantPanel — Premium glass AI sidebar panel
 *
 * Design: ChatGPT Desktop × Claude AI × Raycast quality
 * Style:  Dark glass, purple accents, gradient borders, frosted backdrop
 */

import { useState, useRef, useEffect } from "react";
import {
  Sparkles, MessageSquare, Send, Loader2, Bot, Search,
  BarChart3, FileText, AlertTriangle, Clock, PenLine,
  Copy, Check, ChevronDown, X, Maximize2, Minimize2,
  Zap, BrainCircuit, Stars, PanelRightClose,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  prompt: string;
}

interface AiAssistantPanelProps {
  chatTitle?: string;
}

// ── Constants ───────────────────────────────────────────────────
const QUICK_ACTIONS: QuickAction[] = [
  { icon: BarChart3, label: "오늘 현황", prompt: "오늘 발송 현황을 요약해줘" },
  { icon: AlertTriangle, label: "발송 실패", prompt: "최근 실패한 발송 내역과 원인을 알려줘" },
  { icon: FileText, label: "로그 분석", prompt: "최근 24시간 발송 로그를 분석해줘" },
  { icon: Clock, label: "예약 현황", prompt: "현재 예약된 발송 목록을 보여줘" },
];

const SUGGESTED_PROMPTS = [
  "이번 주 캠페인 성과는 어때?",
  "발송 실패 원인 분석해줘",
  "고객 반응이 가장 좋은 시간대는?",
  "AI 자동 응답 설정 도와줘",
];

// ── Sub-components ─────────────────────────────────────────────

function GlassHeader({ chatTitle, onToggleExpand, isExpanded }: {
  chatTitle?: string;
  onToggleExpand: () => void;
  isExpanded: boolean;
}) {
  return (
    <div className="relative shrink-0 px-4 pt-4 pb-3">
      {/* Glass background overlay */}
      <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      {/* Top row */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Model badge */}
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/40 to-fuchsia-500/20 blur-sm" />
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/20">
              <BrainCircuit className="h-4 w-4 text-violet-300" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90 tracking-tight">AI Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-500/20">
                <Zap className="h-2.5 w-2.5" />
                Claude 4
              </span>
              {chatTitle && (
                <span className="text-[10px] text-white/40 truncate max-w-[140px]">
                  {chatTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpand}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
            aria-label={isExpanded ? "축소" : "확장"}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all" aria-label="패널 닫기">
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick actions — purple glass icon buttons */}
      <div className="relative grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            className="group relative flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            {/* Glass background */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-violet-500/10 to-violet-500/5 border border-violet-500/15 group-hover:border-violet-400/30 group-hover:from-violet-500/20 group-hover:to-violet-500/10 transition-all duration-200" />
            {/* Icon circle */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400/20 to-violet-600/10 border border-violet-400/20 group-hover:border-violet-400/40 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.2)] transition-all duration-200">
              <action.icon className="h-3.5 w-3.5 text-violet-300/80 group-hover:text-violet-200 transition-colors" />
            </div>
            <span className="relative text-[10px] font-medium text-white/40 group-hover:text-white/70 transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={lex  animate-fade-in}>
      <div className={max-w-[88%] }>
        {/* Bubble */}
        <div className="relative group">
          {/* AI message — glass with purple border */}
          {!isUser && (
            <div className="relative rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
              <div className="absolute inset-0 rounded-2xl rounded-bl-md bg-gradient-to-br from-violet-500/[0.08] to-violet-500/[0.02] border border-violet-500/20" />
              <div className="absolute inset-0 rounded-2xl rounded-bl-md bg-white/[0.02] backdrop-blur-xl" />
              <div className="absolute inset-0 rounded-2xl rounded-bl-md border border-violet-400/10 pointer-events-none" />
              <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent pointer-events-none" />
              <p className="relative text-white/85 leading-relaxed">{message.content}</p>
              <button
                onClick={handleCopy}
                className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                aria-label="복사"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}

          {/* User message — right-aligned purple */}
          {isUser && (
            <div className="relative rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
              <div className="absolute inset-0 rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-400/25" />
              <div className="absolute inset-0 rounded-2xl rounded-br-md backdrop-blur-xl" />
              <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent pointer-events-none" />
              <p className="relative text-white/90">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="relative rounded-2xl rounded-bl-md px-4 py-3.5">
        <div className="absolute inset-0 rounded-2xl rounded-bl-md bg-gradient-to-br from-violet-500/[0.06] to-violet-500/[0.02] border border-violet-500/15" />
        <div className="absolute inset-0 rounded-2xl rounded-bl-md bg-white/[0.01] backdrop-blur-xl" />
        <div className="relative flex items-center gap-1.5">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onPrompt, chatTitle }: { onPrompt: (text: string) => void; chatTitle?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-fade-in">
      {/* Logo glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-400/20">
          <Stars className="h-7 w-7 text-violet-300" />
        </div>
      </div>

      <h4 className="text-lg font-semibold text-white/90 mb-1.5">
        무엇을 도와드릴까요?
      </h4>
      <p className="text-xs text-white/40 leading-relaxed max-w-[260px] mb-8">
        {chatTitle
          ? 선택한 대화방의 맥락을 분석하여 최적의 답변을 추천해드립니다.
          : "AI에게 질문하거나 명령을 입력하세요. 필요한 정보를 분석하고 답변을 생성합니다."}
      </p>

      {/* Suggested prompts */}
      <div className="w-full max-w-[280px] space-y-1.5">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="group relative w-full rounded-xl px-3.5 py-2.5 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] group-hover:border-violet-400/20 group-hover:from-violet-500/8 group-hover:to-transparent transition-all duration-200" />
            <div className="relative flex items-center gap-2.5">
              <MessageSquare className="h-3.5 w-3.5 text-violet-400/50 group-hover:text-violet-300/80 shrink-0 transition-colors" />
              <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">{prompt}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export function AiAssistantPanel({ chatTitle }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const msgIdCounter = useRef(0);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function addMessage(role: "user" | "assistant", content: string) {
    const id = msg-;
    setMessages((prev) => [...prev, { id, role, content, timestamp: Date.now() }]);
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInput("");
    addMessage("user", trimmed);
    setLoading(true);

    // Simulate AI response — replace with actual API call
    setTimeout(() => {
      addMessage("assistant", ""에 대한 분석 결과입니다.\n\n현재 데이터를 기반으로 최적의 답변을 준비 중입니다. 곧 더 정확한 정보를 제공해드리겠습니다.);
      setLoading(false);
    }, 1200);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  return (
    <div
      ref={panelRef}
      className="relative flex h-full flex-col overflow-hidden"
      style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
    >
      {/* Left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/20 via-violet-500/10 to-transparent pointer-events-none" />

      {/* Backdrop glass overlay */}
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/[0.01] pointer-events-none" />

      {/* Subtle radial glow in corner */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* ── Header ─────────────────────────────────────────── */}
      <GlassHeader
        chatTitle={chatTitle}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        isExpanded={isExpanded}
      />

      {/* Divider */}
      <div className="relative mx-4 h-px bg-gradient-to-r from-violet-500/15 via-violet-500/5 to-transparent shrink-0" />

      {/* ── Messages ───────────────────────────────────────── */}
      <div className="relative flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && !loading ? (
          <WelcomeScreen onPrompt={handleSend} chatTitle={chatTitle} />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────── */}
      <div className="relative shrink-0 px-4 pb-4 pt-2">
        {/* Glass input container */}
        <div className="relative rounded-xl transition-all duration-200 focus-within:ring-1 focus-within:ring-violet-500/30 focus-within:border-violet-400/30">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 focus-within:border-violet-400/25 transition-colors" />
          <div className="absolute inset-0 rounded-xl backdrop-blur-xl" />

          <div className="relative flex items-end gap-2 px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={1}
              className="min-h-[36px] max-h-[120px] flex-1 resize-none bg-transparent text-sm text-white/80 placeholder-white/30 outline-none leading-relaxed py-1"
              style={{ scrollbarWidth: "thin" }}
            />

            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
              className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-violet-400 hover:to-violet-500 active:scale-95 transition-all duration-150 shadow-lg shadow-violet-500/20"
              aria-label="전송"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-1.5 text-[10px] text-white/20 text-center">
          AI는 실수를 할 수 있습니다. 중요한 정보는 검증해주세요.
        </p>
      </div>
    </div>
  );
}
