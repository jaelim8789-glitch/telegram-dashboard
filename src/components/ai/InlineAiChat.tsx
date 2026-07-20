"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Loader2, MessageSquare, Plus, Sparkles, Menu, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChatMessageBubble } from "@/components/ai/ChatMessageBubble";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";
import * as agentApi from "@/lib/agent-api";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("access_token");
  const sessionToken = localStorage.getItem("session_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sessionToken) headers["X-Session-Token"] = sessionToken;
  return headers;
}

interface StreamMessage {
  role: "user" | "agent";
  content: string;
  toolName?: string;
  toolButtonLabel?: string;
  toolPayload?: Record<string, unknown>;
  tokensUsed: number;
}

export function InlineAiChat() {
  const [agents, setAgents] = useState<agentApi.Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [chats, setChats] = useState<agentApi.AgentChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<agentApi.AgentMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [streamMsg, setStreamMsg] = useState<StreamMessage | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("marketing");
  const [newAgentPrompt, setNewAgentPrompt] = useState("");
  const [creatingAgent, setCreatingAgent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      setAgents(await agentApi.fetchAgents());
    } catch (err) {
      setAgentsError(err instanceof Error ? err.message : "Agent 목록을 불러오는데 실패했습니다.");
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  useEffect(() => {
    if (!activeAgentId) {
      setChats([]);
      setActiveChatId(null);
      return;
    }
    let cancelled = false;
    setChatsLoading(true);
    agentApi.fetchChats(activeAgentId).then((list) => {
      if (!cancelled) setChats(list);
    }).catch(() => {
      // Silently handle — errors are non-critical in inline view
    }).finally(() => {
      if (!cancelled) setChatsLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeAgentId]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    setMessagesError(null);
    agentApi.fetchChatMessages(activeChatId).then((list) => {
      if (!cancelled) setMessages(list);
    }).catch((err) => {
      if (!cancelled) setMessagesError(err instanceof Error ? err.message : "메시지를 불러오는데 실패했습니다.");
    }).finally(() => {
      if (!cancelled) setMessagesLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamMsg]);

  useEffect(() => {
    if (activeChatId && !loading) inputRef.current?.focus();
  }, [activeChatId, loading]);

  async function handleNewChat() {
    if (!activeAgentId) return;
    try {
      const c = await agentApi.createChat(activeAgentId);
      setChats((prev) => [c, ...prev]);
      setActiveChatId(c.id);
    } catch {}
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeChatId || loading) return;
    setInput("");

    const userMsg: StreamMessage = { role: "user", content: text, tokensUsed: 0 };
    setMessages((prev) => [...prev, userMsg as agentApi.AgentMessage]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE_URL}/api/ai/chats/${activeChatId}/message`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setStreamMsg({ role: "agent", content: "서버 오류가 발생했습니다.", tokensUsed: 0 });
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.level_up && data.new_level) {
        toast("success", `🎉 Lv.${data.new_level} 달성!`, {
          description: `${data.exp_gained || 0} EXP를 획득했습니다.`,
          duration: 5000,
        });
        agentApi.fetchAgents().then(setAgents).catch(() => {});
      }

      const msgs = await agentApi.fetchChatMessages(activeChatId);
      setMessages(msgs);
      setStreamMsg(null);
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setStreamMsg({ role: "agent", content: "네트워크 오류가 발생했습니다.", tokensUsed: 0 });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, activeChatId, loading, toast]);

  async function handleExecuteTool(messageId: string, toolName: string, payload: Record<string, unknown>) {
    await agentApi.executeToolAction(messageId, toolName, payload);
    if (activeChatId) {
      const msgs = await agentApi.fetchChatMessages(activeChatId);
      setMessages(msgs);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const activeAgent = agents.find((a) => a.id === activeAgentId);

  return (
    <div className="flex flex-col h-full min-h-[400px] rounded-xl border border-app-border bg-app-card overflow-hidden">
      {/* Agent selector bar */}
      <div className="flex items-center gap-1.5 border-b border-app-border px-3 py-2 overflow-x-auto scrollbar-thin shrink-0">
        {agentsLoading ? (
          <div className="flex gap-1.5">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-lg" />
            ))}
          </div>
        ) : agentsError ? (
          <span className="text-xs text-app-danger truncate">{agentsError}</span>
        ) : agents.length === 0 ? (
          <span className="text-xs text-app-text-muted truncate">Agent가 없습니다</span>
        ) : (
          <>
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => { setActiveAgentId(a.id); setActiveChatId(null); }}
                className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeAgentId === a.id
                    ? "bg-app-primary text-white"
                    : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                }`}
              >
                <Bot className="h-3 w-3" />
                {a.name}
                <span className="ml-0.5 text-[10px] opacity-70">Lv.{a.level}</span>
              </button>
            ))}
            <div className="h-4 w-px bg-app-border mx-0.5" />
            <button
              onClick={() => setShowNewAgentModal(true)}
              className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors"
            >
              <Plus className="h-3 w-3" /> 새 Agent
            </button>
          </>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!activeAgentId ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-app-text-muted">
            <Sparkles className="h-8 w-8 opacity-30" />
            <p className="text-xs">Agent를 선택하고 대화를 시작하세요</p>
            <Button variant="primary" size="sm" onClick={() => setShowNewAgentModal(true)}>
              <Plus className="h-3 w-3" /> 새 Agent
            </Button>
          </div>
        ) : !activeChatId ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-app-text-muted">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <p className="text-xs">
              <span className="font-medium text-app-text">{activeAgent?.name}</span> 👋
            </p>
            <Button variant="primary" size="sm" onClick={handleNewChat}>
              <Plus className="h-3 w-3" /> 새 채팅
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {messagesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <div className="space-y-1.5">
                      <Skeleton className={`h-3 w-12 rounded`} />
                      <Skeleton className={`h-14 w-40 rounded-2xl ${i % 2 === 0 ? "rounded-br-md" : "rounded-bl-md"}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : messagesError ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <InlineError className="max-w-md">{messagesError}</InlineError>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-app-text-muted">
                <MessageSquare className="h-6 w-6 opacity-30" />
                <p className="text-xs">메시지를 보내서 대화를 시작하세요</p>
              </div>
            ) : (
              messages.map((m) => (
                <ChatMessageBubble key={m.id} message={m} onExecuteTool={handleExecuteTool} />
              ))
            )}

            {loading && !streamMsg?.content && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-app-border bg-app-card-hover px-3 py-2 text-xs text-app-text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  답변 생성 중...
                </div>
              </div>
            )}
            {streamMsg?.content && (
              <ChatMessageBubble
                message={{
                  id: "streaming",
                  role: "agent",
                  content: streamMsg.content,
                  toolName: streamMsg.toolName,
                  toolButtonLabel: streamMsg.toolButtonLabel,
                  toolPayload: streamMsg.toolPayload,
                  tokensUsed: streamMsg.tokensUsed,
                  createdAt: "",
                }}
                onExecuteTool={handleExecuteTool}
              />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Chat input */}
      {activeChatId && (
        <div className="border-t border-app-border px-3 py-2.5 shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${activeAgent?.name || "Agent"}에게 메시지 보내기...`}
              disabled={loading}
              className="min-h-[40px] flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-app-text-muted/50 focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 disabled:opacity-50"
            />
            <Button variant="primary" onClick={sendMessage} loading={loading} disabled={!input.trim()} className="min-h-[40px] min-w-[40px]">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
