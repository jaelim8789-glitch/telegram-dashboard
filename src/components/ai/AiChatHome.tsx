"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  FileText,
  Mic,
  BarChart3,
  MessageSquare,
  Settings,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useCategoryStore } from "@/store/useCategoryStore";
import { TELEMON_AI_NAME, TELEMON_HOME_GREETING } from "@/lib/ai/telemon-prompt";
import { streamChat, type ChatMessage } from "@/lib/ai/ai-chat";

const SUGGESTED_QUESTIONS = [
  "현재 발송 상태가 어떻게 되나요?",
  "자동 응답 매크로를 만들어주세요.",
  "이번 주 통계를 분석해주세요.",
  "채팅방 응답률이 낮은 곳을 알려주세요.",
];

const QUICK_ACTIONS = [
  { id: "send", label: "메시지 발송", icon: Send, color: "from-blue-500 to-blue-600" },
  { id: "macro", label: "매크로", icon: FileText, color: "from-violet-500 to-violet-600" },
  { id: "analytics", label: "분석", icon: BarChart3, color: "from-emerald-500 to-emerald-600" },
  { id: "settings", label: "설정", icon: Settings, color: "from-amber-500 to-amber-600" },
];

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function AiChatHome() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const setCategory = useCategoryStore((s) => s.setCategory);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;
  const streamMsgId = useRef<string | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-height textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);

      const userMsg: UiMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      const assistantMsg: UiMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      streamMsgId.current = assistantMsg.id;
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);
      setStreamingContent("");
      setInput("");

      // Build chat history for API
      const history: ChatMessage[] = [
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: trimmed },
      ];

      const controller = new AbortController();
      abortRef.current = controller;

      streamChat(history, {
        onToken: (token) => {
          setStreamingContent((prev) => prev + token);
        },
        onDone: (fullContent) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamMsgId.current ? { ...m, content: fullContent } : m,
            ),
          );
          setStreamingContent("");
          setIsLoading(false);
          abortRef.current = null;
        },
        onError: (err) => {
          setError(err.message);
          // Remove the empty assistant message
          setMessages((prev) => prev.filter((m) => m.id !== streamMsgId.current));
          setStreamingContent("");
          setIsLoading(false);
          abortRef.current = null;
        },
      }, { signal: controller.signal });
    },
    [messages, isLoading],
  );

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.filter((m) => m.role !== "assistant" || m.content !== ""));
      handleSend(lastUserMsg.content);
    }
  }, [messages, handleSend]);

  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      handleSend(question);
    },
    [handleSend],
  );

  const handleQuickAction = useCallback(
    (categoryId: string) => {
      setCategory(categoryId);
    },
    [setCategory],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(input);
      }
    },
    [handleSend, input],
  );

  const handleCancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    // Keep partial stream content
    if (streamingContent) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamMsgId.current ? { ...m, content: streamingContent } : m,
        ),
      );
    }
    setStreamingContent("");
  }, [streamingContent]);

  return (
    <div className="flex h-full flex-col bg-app-bg">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col px-4 sm:px-6">
          {/* ── Hero Section (shown before first message) ── */}
          <AnimatePresence mode="wait">
            {!hasMessages ? (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center pb-8"
              >
                {/* ── Logo + Ripple ── */}
                <div className="relative mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/25">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  {/* Ripple rings */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-violet-500/30"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      repeatDelay: 0.5,
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-blue-500/20"
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.8,
                      repeatDelay: 0.5,
                    }}
                  />
                </div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="mb-2 text-2xl font-bold text-app-text"
                >
                  {TELEMON_AI_NAME}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="mb-10 text-base text-app-text-muted"
                >
                  {TELEMON_HOME_GREETING}
                </motion.p>

                {/* ── Suggested Questions ── */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mb-8 flex w-full flex-wrap justify-center gap-2"
                >
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={q}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.2 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSuggestedQuestion(q)}
                      className="rounded-full border border-app-border bg-app-card px-4 py-2 text-sm text-app-text-secondary transition-colors hover:border-violet-500/30 hover:bg-app-card-hover hover:text-app-text"
                    >
                      {q}
                    </motion.button>
                  ))}
                </motion.div>

                {/* ── Quick Actions ── */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="flex flex-wrap justify-center gap-3"
                >
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickAction(action.id)}
                        className="flex items-center gap-2.5 rounded-xl bg-app-card px-5 py-3 text-sm text-app-text-secondary transition-colors hover:text-app-text"
                        style={{ border: "1px solid var(--color-border)" }}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${action.color}`}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="py-4"
              >
                {/* ── Chat Messages ── */}
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                            : "border border-app-border bg-app-card text-app-text"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
                              <Sparkles className="h-2.5 w-2.5 text-white" />
                            </div>
                            <span className="text-xs font-medium text-app-text-muted">
                              TeleMon AI
                            </span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* ── Streaming response ── */}
                  {isLoading && streamingContent && (
                    <motion.div
                      key="streaming"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] rounded-2xl border border-app-border bg-app-card px-4 py-3 sm:max-w-[75%]">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
                            <Sparkles className="h-2.5 w-2.5 text-white" />
                          </div>
                          <span className="text-xs font-medium text-app-text-muted">
                            TeleMon AI
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text">
                          {streamingContent}
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                            className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 rounded-sm align-middle"
                          />
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Loading dots (before any token) ── */}
                  {isLoading && !streamingContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="rounded-2xl border border-app-border bg-app-card px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
                            <Sparkles className="h-2.5 w-2.5 text-white" />
                          </div>
                          <div className="flex items-center gap-1">
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                              className="inline-block h-2 w-2 rounded-full bg-violet-400"
                            />
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                              className="inline-block h-2 w-2 rounded-full bg-violet-400"
                            />
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                              className="inline-block h-2 w-2 rounded-full bg-violet-400"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Cancel stream button ── */}
                  {isLoading && streamingContent && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleCancelStream}
                        className="rounded-full border border-app-border px-4 py-1.5 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
                      >
                        생성 중단
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Error banner ── */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-400">오류가 발생했습니다</p>
                      <p className="mt-0.5 text-xs text-app-text-muted">{error}</p>
                      <button
                        onClick={handleRetry}
                        className="mt-2 rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        다시 시도
                      </button>
                    </div>
                  </motion.div>
                )}

                <div ref={bottomRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Input Area (fixed at bottom) ── */}
      <div
        className="shrink-0 border-t border-app-border bg-app-bg px-4 py-3 sm:px-6"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-violet-500/20 bg-app-card px-4 py-2.5 transition-colors focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/10">
            {/* Attachment button */}
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
              aria-label="파일 첨부"
            >
              <FileText className="h-4 w-4" />
            </button>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="TeleMon AI에게 물어보세요..."
              disabled={isLoading}
              rows={1}
              className="min-h-[40px] max-h-[160px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-app-text placeholder:text-app-text-muted/60 outline-none disabled:opacity-50"
            />

            {/* Voice input */}
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
              aria-label="음성 입력"
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Send button */}
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-sm shadow-violet-500/25 transition-all hover:from-violet-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="전송"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
