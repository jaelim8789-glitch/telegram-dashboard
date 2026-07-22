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

  // Agent purpose templates
  const PURPOSE_TEMPLATES = [
    {
      id: "web_search",
      role: "web_search",
      name: "🔍 웹서치팀",
      desc: "웹 검색 + 요약 전문",
      prompt: "당신은 웹 리서치 전문가입니다. 최신 뉴스, 트렌드, 정보를 수집하여 간결하게 요약합니다. 항상 출처를 명시하고 한국어로 응답하세요.",
    },
    {
      id: "marketing",
      role: "marketing",
      name: "📊 마케터",
      desc: "카피라이팅 + 분석",
      prompt: "당신은 전문 마케팅 어시스턴트입니다. 타겟 분석, 카피 작성, 프로모션 전략을 수립합니다. 항상 데이터 기반으로 조언하고 한국어로 응답하세요.",
    },
    {
      id: "customer_support",
      role: "custom",
      name: "💬 고객응대팀",
      desc: "자동 응대 + CS",
      prompt: "당신은 친절하고 전문적인 고객 응대 매니저입니다. 고객 문의에 신속하고 정확하게 답변하며, 공감적인 태도를 유지하세요. 한국어로 응답합니다.",
    },
    {
      id: "content_creator",
      role: "custom",
      name: "✍️ 콘텐츠팀",
      desc: "포스트 + 뉴스레터 작성",
      prompt: "당신은 창의적인 콘텐츠 크리에이터입니다. 텔레그램 채널용 포스트, 뉴스레터, 광고 카피를 작성합니다. 트렌드에 민감하고 참신한 아이디어를 제시하세요.",
    },
    {
      id: "data_analyst",
      role: "custom",
      name: "📈 데이터분석팀",
      desc: "통계 + 인사이트 도출",
      prompt: "당신은 데이터 분석 전문가입니다. 발송 통계, 사용자 행동 데이터, 성과 지표를 분석하여 인사이트를 도출합니다. 숫자와 차트를 활용한 명확한 분석을 제공하세요.",
    },
    {
      id: "scheduler",
      role: "scheduler",
      name: "⏰ 스케줄러",
      desc: "발송 일정 최적화",
      prompt: "당신은 일정 관리 및 코디네이션 전문가입니다. 발송 일정을 계획하고, 반복 작업을 설정하며, 시간대별 최적 발송 전략을 제안합니다.",
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
    setChatsError(null);
    agentApi.fetchChats(activeAgentId).then((list) => {
      if (!cancelled) setChats(list);
    }).catch((err) => {
      if (!cancelled) setChatsError(err instanceof Error ? err.message : "채팅 목록을 불러오는데 실패했습니다.");
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
    } catch {
      // Error handled silently
    } finally {
      setCreatingAgent(false);
    }
  }

  async function handleDeleteAgent(id: string) {
    try {
      await agentApi.deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      if (activeAgentId === id) setActiveAgentId(null);
    } catch {}
  }

  async function handleNewChat() {
    if (!activeAgentId) return;
    try {
      const c = await agentApi.createChat(activeAgentId);
      setChats((prev) => [c, ...prev]);
      setActiveChatId(c.id);
    } catch {}
  }

  async function handleDeleteChat(id: string) {
    try {
      await agentApi.deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) setActiveChatId(null);
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
        headers: await api.authHeaders(),
        body: JSON.stringify({ content: text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setStreamMsg({ role: "agent", content: "서버 오류가 발생했습니다.", tokensUsed: 0 });
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Level-up notification
      if (data.level_up && data.new_level) {
        toast("success", `🎉 Lv.${data.new_level} 달성!`, {
          description: `${data.exp_gained || 0} EXP를 획득했습니다.`,
          duration: 5000,
        });
        // Refresh agent list to update level/exp
        agentApi.fetchAgents().then(setAgents).catch((e) => console.error("[chat/page] fetchAgents 갱신 실패", e));
      }

      // Reload messages
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

  const quickTools = [
    { label: "@send", action: () => setInput((p) => p + "@send ") },
    { label: "@search", action: () => setInput((p) => p + "@search ") },
    { label: "@schedule", action: () => setInput((p) => p + "@schedule ") },
  ];

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] bg-app-bg">
      {/* ── Mobile sidebar toggle ── */}
      <div className="fixed bottom-4 left-4 z-30 sm:hidden">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-app-primary text-white shadow-lg shadow-app-primary/30 active:scale-95 transition-transform"
          aria-label="사이드바 열기"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Sidebar ── */}
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

      {/* ── Main Chat Area ── */}
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
            <InlineError title="Agent를 불러올 수 없습니다" className="max-w-md">
              {agentsError}
            </InlineError>
            <Button variant="primary" size="sm" onClick={loadAgents}>
              다시 시도
            </Button>
          </div>
        ) : !activeAgentId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-app-text-muted p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-card shadow-sm">
              <Sparkles className="h-8 w-8 text-app-primary" />
            </div>
            <p className="text-sm font-medium text-center">AI Agent와 대화를 시작하세요</p>
            <p className="max-w-xs text-center text-xs">
              왼쪽 사이드바에서 Agent를 선택하거나 새로 만드세요
            </p>
            <Button variant="primary" size="sm" onClick={handleNewAgent}>
              <Plus className="h-3.5 w-3.5" /> 새 Agent 만들기
            </Button>
          </div>
        ) : !activeChatId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-app-text-muted p-4">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm text-center">
              <span className="font-medium text-app-text">{activeAgent?.name}</span>
              {" 👋"}
            </p>
            <p className="text-xs text-center">새 채팅을 시작하거나 기존 채팅을 선택하세요</p>
            <Button variant="primary" size="sm" onClick={handleNewChat}>
              <Plus className="h-3.5 w-3.5" /> 새 채팅
            </Button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 border-b border-app-border px-4 py-2.5">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text -ml-1"
                aria-label="사이드바 열기"
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
                {messagesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
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
                      <Button variant="secondary" size="sm" onClick={() => activeChatId && agentApi.fetchChatMessages(activeChatId).then(setMessages).catch((e) => console.error("[chat/page] fetchChatMessages 재시도 실패", e))}>
                      다시 시도
                    </Button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-app-text-muted">
                    <MessageSquare className="h-8 w-8 opacity-30" />
                    <p className="text-xs">메시지를 보내서 대화를 시작하세요</p>
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
                    placeholder={`${activeAgent?.name || "Agent"}에게 메시지 보내기...`}
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

      {/* ── New Agent Modal ── */}
      <Modal
        open={showNewAgentModal}
        onClose={() => !creatingAgent && setShowNewAgentModal(false)}
        title="새 Agent 만들기"
        size="lg"
        preventClose={creatingAgent}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowNewAgentModal(false)} disabled={creatingAgent}>
              취소
            </Button>
            <Button variant="primary" size="sm" onClick={confirmCreateAgent} loading={creatingAgent} disabled={!newAgentName.trim()}>
              {creatingAgent ? "생성 중..." : "생성"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Purpose Templates */}
          <div>
            <label className="mb-2 block text-xs font-medium text-app-text-muted">
              🎯 목적 템플릿 선택 <span className="text-app-text-subtle">(선택 시 자동 입력)</span>
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
            <span className="text-[10px] text-app-text-muted uppercase tracking-wider">또는 직접 설정</span>
            <div className="flex-1 h-px bg-app-border" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">이름</label>
            <input
              value={newAgentName}
              onChange={(e) => { setNewAgentName(e.target.value); setSelectedTemplate(null); }}
              placeholder="예: 마케팅팀-1"
              disabled={creatingAgent}
              className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">역할</label>
            <select
              value={newAgentRole}
              onChange={(e) => { setNewAgentRole(e.target.value); setSelectedTemplate(null); }}
              disabled={creatingAgent}
              className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary disabled:opacity-50"
            >
              <option value="marketing">📊 마케팅</option>
              <option value="web_search">🔍 웹 검색</option>
              <option value="coding">💻 코딩</option>
              <option value="scheduler">⏰ 스케줄러</option>
              <option value="custom">🤖 커스텀</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">System Prompt (선택)</label>
            <textarea
              value={newAgentPrompt}
              onChange={(e) => { setNewAgentPrompt(e.target.value); setSelectedTemplate(null); }}
              placeholder="Agent의 성격과 역할을 정의하세요..."
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
