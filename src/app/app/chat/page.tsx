"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageSquare, Plus, Sparkles, Menu, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AgentSidebar } from "@/components/ai/AgentSidebar";
import { ChatMessageBubble } from "@/components/ai/ChatMessageBubble";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api";
import * as agentApi from "@/lib/agent-api";
import { detectBusinessCreationRequest } from "@/lib/ai/business-generator";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAiWhisper } from "@/hooks/useAiWhisper";
import { WhisperPanel } from "@/components/ai/WhisperPanel";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface StreamMessage {
  role: "user" | "agent";
  content: string;
  toolName?: string;
  toolButtonLabel?: string;
  toolPayload?: Record<string, unknown>;
  tokensUsed: number;
}

export default function AgentChatPage() {
  const [agents, setAgents] = useState<agentApi.Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [chats, setChats] = useState<agentApi.AgentChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<agentApi.AgentMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [streamMsg, setStreamMsg] = useState<StreamMessage | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("marketing");
  const [newAgentPrompt, setNewAgentPrompt] = useState("");
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Get the showBusinessModal state and setter from the store
  const showBusinessModal = useDashboardStore((state) => state.showBusinessModal);
  const setShowBusinessModal = useDashboardStore((state) => state.setShowBusinessModal);

  // Agent purpose templates
  const PURPOSE_TEMPLATES = [
    {
      id: "web_search",
      role: "web_search",
      name: "?�� ?�서치�?",
      desc: "??검??+ ?�약 ?�문",
      prompt: "?�신?� ??리서�??�문가?�니?? 최신 ?�스, ?�렌?? ?�보�??�집?�여 간결?�게 ?�약?�니?? ??�� 출처�?명시?�고 ?�국?�로 ?�답?�세??",
    },
    {
      id: "marketing",
      role: "marketing",
      name: "?�� 마�???,
      desc: "카피?�이??+ 분석",
      prompt: "?�신?� ?�문 마�????�시?�턴?�입?�다. ?��?분석, 카피 ?�성, ?�로모션 ?�략???�립?�니?? ??�� ?�이??기반?�로 조언?�고 ?�국?�로 ?�답?�세??",
    },
    {
      id: "customer_support",
      role: "custom",
      name: "?�� 고객?��??�",
      desc: "?�동 ?��? + CS",
      prompt: "?�신?� 친절?�고 ?�문?�인 고객 ?��? 매니?�?�니?? 고객 문의???�속?�고 ?�확?�게 ?��??�며, 공감?�인 ?�도�??��??�세?? ?�국?�로 ?�답?�니??",
    },
    {
      id: "content_creator",
      role: "custom",
      name: "?�️ 콘텐츠�?",
      desc: "?�스??+ ?�스?�터 ?�성",
      prompt: "?�신?� 창의?�인 콘텐�??�리?�이?�입?�다. ?�레그램 채널???�스?? ?�스?�터, 광고 카피�??�성?�니?? ?�렌?�에 민감?�고 참신???�이?�어�??�시?�세??",
    },
    {
      id: "data_analyst",
      role: "custom",
      name: "?�� ?�이?�분?��?",
      desc: "?�계 + ?�사?�트 ?�출",
      prompt: "?�신?� ?�이??분석 ?�문가?�니?? 발송 ?�계, ?�용???�동 ?�이?? ?�과 지?��? 분석?�여 ?�사?�트�??�출?�니?? ?�자?� 차트�??�용??명확??분석???�공?�세??",
    },
    {
      id: "scheduler",
      role: "scheduler",
      name: "???��?줄러",
      desc: "발송 ?�정 최적??,
      prompt: "?�신?� ?�정 관�?�?코디?�이???�문가?�니?? 발송 ?�정??계획?�고, 반복 ?�업???�정?�며, ?�간?��?최적 발송 ?�략???�안?�니??",
    },
  ];
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const list = await agentApi.fetchAgents();
      setAgents(list);
    } catch (err) {
      setAgentsError(err instanceof Error ? err.message : "Agent 목록??불러?�는???�패?�습?�다.");
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
    setChatsError(null);
    agentApi.fetchChats(activeAgentId).then((list) => {
      if (!cancelled) setChats(list);
    }).catch((err) => {
      if (!cancelled) setChatsError(err instanceof Error ? err.message : "채팅 목록??불러?�는???�패?�습?�다.");
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
      if (!cancelled) setMessagesError(err instanceof Error ? err.message : "메시지�?불러?�는???�패?�습?�다.");
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

  function handleSelectAgent(id: string) {
    if (id === activeAgentId) return;
    setActiveAgentId(id);
    setMobileSidebarOpen(false);
  }

  function handleSelectChat(id: string) {
    if (id === activeChatId) return;
    setActiveChatId(id);
    setStreamMsg(null);
    setMobileSidebarOpen(false);
  }

  function handleNewAgent() {
    setShowNewAgentModal(true);
    setNewAgentName("");
    setNewAgentRole("marketing");
    setNewAgentPrompt("");
    setSelectedTemplate(null);
  }

  function applyTemplate(templateId: string) {
    const tmpl = PURPOSE_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    setSelectedTemplate(templateId);
    setNewAgentName(tmpl.name.replace(/^[^\s]+\s/, ''));  // Remove emoji prefix
    setNewAgentRole(tmpl.role);
    setNewAgentPrompt(tmpl.prompt);
  }

  async function confirmCreateAgent() {
    if (!newAgentName.trim() || creatingAgent) return;
    setCreatingAgent(true);
    try {
      const a = await agentApi.createAgent({ name: newAgentName, role: newAgentRole, systemPrompt: newAgentPrompt });
      setAgents((prev) => [...prev, a]);
      setActiveAgentId(a.id);
      setShowNewAgentModal(false);
    } catch (e) { console.warn('Unhandled error in page', e) } finally {
      setCreatingAgent(false);
    }
  }

  async function handleDeleteAgent(id: string) {
    try {
      await agentApi.deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      if (activeAgentId === id) setActiveAgentId(null);
    } catch (e) { console.warn('Unhandled error in page', e) }
  }

  async function handleNewChat() {
    if (!activeAgentId) return;
    try {
      const c = await agentApi.createChat(activeAgentId);
      setChats((prev) => [c, ...prev]);
      setActiveChatId(c.id);
    } catch (e) { console.warn('Unhandled error in page', e) }
  }

  async function handleDeleteChat(id: string) {
    try {
      await agentApi.deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) setActiveChatId(null);
    } catch (e) { console.warn('Unhandled error in page', e) }
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeChatId || loading) return;
    
    // Check if the input is a business creation request
    if (detectBusinessCreationRequest(text)) {
      setInput("");
      setShowBusinessModal(true);
      return;
    }

    setInput("");

    const userMsg: StreamMessage = { role: "user", content: text, tokensUsed: 0 };
    setMessages((prev) => [...prev, userMsg as agentApi.AgentMessage]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE_URL}/api/ai/chats/${activeChatId}/message`, {
        method: "POST",
        headers: await api.authHeaders(),
        body: JSON.stringify({ content: text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setStreamMsg({ role: "agent", content: "?�버 ?�류가 발생?�습?�다.", tokensUsed: 0 });
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Level-up notification
      if (data.level_up && data.new_level) {
        toast("success", `?�� Lv.${data.new_level} ?�성!`, {
          description: `${data.exp_gained || 0} EXP�??�득?�습?�다.`,
          duration: 5000,
        });
        // Refresh agent list to update level/exp
        agentApi.fetchAgents().then(setAgents).catch((e) => { console.error("[chat/page] fetchAgents 갱신 ?�패", e); toast("error", "Agent 목록 갱신???�패?�습?�다"); });
      }

      // Reload messages
      const msgs = await agentApi.fetchChatMessages(activeChatId);
      setMessages(msgs);
      setStreamMsg(null);
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setStreamMsg({ role: "agent", content: "?�트?�크 ?�류가 발생?�습?�다.", tokensUsed: 0 });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, activeChatId, loading, toast, setShowBusinessModal]);

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

  const {
    whisper,
    loading: whisperLoading,
    dismissed: whisperDismissed,
    send: whisperSend,
    dismiss: whisperDismiss,
    editAndSend: whisperEditAndSend,
    show: whisperShow,
  } = useAiWhisper(activeChatId, {
    customerName: activeAgent?.name || "고객",
    recentMessages: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
  });

  const handleWhisperSend = () => {
    if (whisper) {
      setInput(whisper.suggestedReply);
      whisperSend();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleWhisperEdit = (newMessage: string) => {
    setInput(newMessage);
    whisperEditAndSend(newMessage);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const quickTools = [
    { label: "@send", action: () => setInput((p) => p + "@send ") },
    { label: "@search", action: () => setInput((p) => p + "@search ") },
    { label: "@schedule", action: () => setInput((p) => p + "@schedule ") },
  ];

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] bg-app-bg">
      {/* ?�?� Mobile sidebar toggle ?�?� */}
      <div className="fixed bottom-4 left-4 z-30 sm:hidden">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-app-primary text-white shadow-lg shadow-app-primary/30 active:scale-95 transition-transform"
          aria-label="?�이?�바 ?�기"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ?�?� Sidebar ?�?� */}
      <div
        className={`${mobileSidebarOpen ? "fixed inset-0 z-40 flex" : "hidden"} sm:relative sm:z-auto sm:flex`}
      >
        {mobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 sm:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}
        <div
          className={`relative z-10 h-full transition-transform duration-300 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
          } ${sidebarCollapsed ? "" : ""}`}
        >
          <AgentSidebar
            agents={agents}
            agentsLoading={agentsLoading}
            agentsError={agentsError}
            onRetryAgents={loadAgents}
            activeAgentId={activeAgentId}
            onSelectAgent={handleSelectAgent}
            chats={chats}
            chatsLoading={chatsLoading}
            chatsError={chatsError}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewAgent={handleNewAgent}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onDeleteAgent={handleDeleteAgent}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        </div>
      </div>

      {/* ?�?� Main Chat Area ?�?� */}
      <div className="flex flex-1 flex-col min-w-0">
        {agentsLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
        ) : agentsError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <InlineError title="Agent�?불러?????�습?�다" className="max-w-md">
              {agentsError}
            </InlineError>
            <Button variant="primary" size="sm" onClick={loadAgents}>
              ?�시 ?�도
            </Button>
          </div>
        ) : !activeAgentId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-app-text-muted p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-card shadow-sm">
              <Sparkles className="h-8 w-8 text-app-primary" />
            </div>
            <p className="text-sm font-medium text-center">AI Agent?� ?�?��? ?�작?�세??/p>
            <p className="max-w-xs text-center text-xs">
              ?�쪽 ?�이?�바?�서 Agent�??�택?�거???�로 만드?�요
            </p>
            <Button variant="primary" size="sm" onClick={handleNewAgent}>
              <Plus className="h-3.5 w-3.5" /> ??Agent 만들�?            </Button>
          </div>
        ) : !activeChatId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-app-text-muted p-4">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm text-center">
              <span className="font-medium text-app-text">{activeAgent?.name}</span>
              {" ?��"}
            </p>
            <p className="text-xs text-center">??채팅???�작?�거??기존 채팅???�택?�세??/p>
            <Button variant="primary" size="sm" onClick={handleNewChat}>
              <Plus className="h-3.5 w-3.5" /> ??채팅
            </Button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 border-b border-app-border px-4 py-2.5">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text -ml-1"
                aria-label="?�이?�바 ?�기"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-app-text truncate">
                  {activeAgent?.name}
                </span>
                <span className="shrink-0 rounded bg-app-card-hover px-1.5 py-0.5 text-[10px] text-app-text-muted">
                  {activeAgent?.role}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-app-text-muted shrink-0">
                {messages.length > 0 && (
                  <span>{messages.length} 메시지</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto max-w-3xl space-y-4">
                {activeChatId && (
                  <WhisperPanel
                    whisper={whisper}
                    loading={whisperLoading}
                    dismissed={whisperDismissed}
                    onShow={whisperShow}
                    onSend={handleWhisperSend}
                    onEdit={handleWhisperEdit}
                    onDismiss={whisperDismiss}
                  />
                )}
                {messagesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={`chat-sk-${i}`} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                        <div className={`space-y-2 ${i % 2 === 0 ? "items-end" : "items-start"}`}>
                          <Skeleton className={`h-3 w-16 rounded`} />
                          <Skeleton className={`h-16 w-48 sm:w-72 rounded-2xl ${i % 2 === 0 ? "rounded-br-md" : "rounded-bl-md"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messagesError ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <InlineError className="max-w-md">{messagesError}</InlineError>
                      <Button variant="secondary" size="sm" onClick={() => activeChatId && agentApi.fetchChatMessages(activeChatId).then(setMessages).catch((e) => { console.error("[chat/page] fetchChatMessages ?�시???�패", e); toast("error", "메시지 ?�로고침???�패?�습?�다"); })}>
                      ?�시 ?�도
                    </Button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-app-text-muted">
                    <MessageSquare className="h-8 w-8 opacity-30" />
                    <p className="text-xs">메시지�?보내???�?��? ?�작?�세??/p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <ChatMessageBubble
                      key={m.id}
                      message={m}
                      onExecuteTool={handleExecuteTool}
                    />
                  ))
                )}

                {loading && !streamMsg?.content && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-app-border bg-app-card-hover px-4 py-2.5 text-sm text-app-text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      ?��? ?�성 �?..
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
            </div>

            {/* Input */}
            <div className="border-t border-app-border bg-app-card px-4 py-3">
              <div className="mx-auto max-w-3xl">
                <div className="mb-2 flex gap-1 overflow-x-auto scrollbar-thin">
                  {quickTools.map((t) => (
                    <button
                      key={t.label}
                      onClick={t.action}
                      className="shrink-0 rounded-md border border-app-border px-2 py-1 text-[11px] text-app-text-muted transition-colors hover:border-app-border-strong hover:text-app-text"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`${activeAgent?.name || "Agent"}?�게 메시지 보내�?..`}
                    disabled={loading}
                    className="min-h-[44px] flex-1 rounded-xl border border-app-border bg-app-bg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-app-text-muted/50 focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 disabled:opacity-50"
                  />
                  <Button variant="primary" onClick={sendMessage} loading={loading} disabled={!input.trim()} className="min-h-[44px] min-w-[44px]">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ?�?� New Agent Modal ?�?� */}
      <Modal
        open={showNewAgentModal}
        onClose={() => !creatingAgent && setShowNewAgentModal(false)}
        title="??Agent 만들�?
        size="lg"
        preventClose={creatingAgent}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowNewAgentModal(false)} disabled={creatingAgent}>
              취소
            </Button>
            <Button variant="primary" size="sm" onClick={confirmCreateAgent} loading={creatingAgent} disabled={!newAgentName.trim()}>
              {creatingAgent ? "?�성 �?.." : "?�성"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Purpose Templates */}
          <div>
            <label className="mb-2 block text-xs font-medium text-app-text-muted">
              ?�� 목적 ?�플�??�택 <span className="text-app-text-subtle">(?�택 ???�동 ?�력)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PURPOSE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={creatingAgent}
                  onClick={() => applyTemplate(tmpl.id)}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    selectedTemplate === tmpl.id
                      ? "border-app-primary/50 bg-app-primary/10 ring-1 ring-app-primary/30"
                      : "border-app-border hover:border-app-primary/30 hover:bg-app-card-hover"
                  }`}
                >
                  <div className="font-medium text-sm text-app-text">{tmpl.name}</div>
                  <div className="text-xs text-app-text-muted mt-0.5">{tmpl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-app-border" />
            <span className="text-[10px] text-app-text-muted uppercase tracking-wider">?�는 직접 ?�정</span>
            <div className="flex-1 h-px bg-app-border" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">?�름</label>
            <input
              value={newAgentName}
              onChange={(e) => { setNewAgentName(e.target.value); setSelectedTemplate(null); }}
              placeholder="?? 마�??��?-1"
              disabled={creatingAgent}
              className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">??��</label>
            <select
              value={newAgentRole}
              onChange={(e) => { setNewAgentRole(e.target.value); setSelectedTemplate(null); }}
              disabled={creatingAgent}
              className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary disabled:opacity-50"
            >
              <option value="marketing">?�� 마�???/option>
              <option value="web_search">?�� ??검??/option>
              <option value="coding">?�� 코딩</option>
              <option value="scheduler">???��?줄러</option>
              <option value="custom">?�� 커스?�</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">System Prompt (?�택)</label>
            <textarea
              value={newAgentPrompt}
              onChange={(e) => { setNewAgentPrompt(e.target.value); setSelectedTemplate(null); }}
              placeholder="Agent???�격�???��???�의?�세??.."
              rows={3}
              disabled={creatingAgent}
              className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary disabled:opacity-50"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}