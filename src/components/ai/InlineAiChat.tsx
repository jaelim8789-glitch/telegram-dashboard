"use client";



import { useState, useEffect, useRef, useCallback } from "react";

import {

  Send, Loader2, MessageSquare, Plus, Sparkles, Menu, Bot,

  ChevronLeft, Trash2, Mic, MicOff, Clock, BarChart3, AlertTriangle, FileText, CheckCircle,

  PenLine, ExternalLink, RefreshCw,

} from "lucide-react";

import { Button } from "@/components/ui/Button";

import { ChatMessageBubble } from "@/components/ai/ChatMessageBubble";

import { MarkdownMessage } from "@/components/ai/MarkdownMessage";

import { AiWelcomeCard } from "@/components/ai/AiWelcomeCard";

import { AiStaffBoard, FloatingAiButton } from "@/components/ai/AiStaffBoard";

import { SwipeableRow } from "@/components/ui/SwipeableRow";

import { Skeleton } from "@/components/ui/Skeleton";

import { InlineError } from "@/components/ui/InlineError";

import { useToast } from "@/components/ui/Toast";

import * as api from "@/lib/api";

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

import * as agentApi from "@/lib/agent-api";

import type { ToolConfirmation } from "@/lib/agent-api";

import { useDashboardStore } from "@/store/useDashboardStore";



const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";



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

  const [autoChatCreating, setAutoChatCreating] = useState(false);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const [messages, setMessages] = useState<agentApi.AgentMessage[]>([]);

  const [messagesLoading, setMessagesLoading] = useState(false);

  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [streamMsg, setStreamMsg] = useState<StreamMessage | null>(null);

  const [pendingConfirmation, setPendingConfirmation] = useState<ToolConfirmation | null>(null);

  const [confirmingTool, setConfirmingTool] = useState(false);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [showNewAgentModal, setShowNewAgentModal] = useState(false);

  const [newAgentName, setNewAgentName] = useState("");

  const [newAgentRole, setNewAgentRole] = useState("marketing");

  const [newAgentPrompt, setNewAgentPrompt] = useState("");

  const [creatingAgent, setCreatingAgent] = useState(false);

  const [chatPanelOpen, setChatPanelOpen] = useState(false);

  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);

  const [speechSupported, setSpeechSupported] = useState(false);

  const [broadcastSummary, setBroadcastSummary] = useState<{ sent: number; failed: number; scheduled: number } | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);

  const [fabOpen, setFabOpen] = useState(false);

  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLongPressRef = useRef(false);

  const recognitionRef = useRef<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const abortRef = useRef<AbortController | null>(null);

  const { toast } = useToast();

  const toastRef = useRef(toast);

  toastRef.current = toast;



  const loadAgents = useCallback(async () => {

    setAgentsLoading(true);

    setAgentsError(null);

    try {

      setAgents(await agentApi.fetchAgents());

    } catch (err) {

      setAgentsError(err instanceof Error ? err.message : "Agent 목록??불러?는???패?습?다.");

    } finally {

      setAgentsLoading(false);

    }

  }, []);



  useEffect(() => { loadAgents(); }, [loadAgents]);



  // ?? Auto-init: create default agent + chat on first visit ??????

  useEffect(() => {

    if (agentsLoading) return;

    if (activeChatId) return;



    // If there was a previous error, allow retry when agents become available

    // (e.g. user created an agent manually)

    if (agentsError && agents.length === 0) return;



    let cancelled = false;



    async function autoInit() {

      let agentId: string | null = null;



      // 1. If no agents exist, create a default "?만??AI" agent

      if (agents.length === 0) {

        try {

          const defaultAgent = await agentApi.createAgent({

            name: "?만??AI",

            role: "assistant",

            systemPrompt:

              "?는 TeleMon??AI 비서 '?만??AI'?? ?용?? 친절?게 ??주고, " +

              "TeleMon ?랫???레그램 마????동????관??질문???문?으????줘. " +

              "?국?로 ?답?고, ?요?????모지??절???용??",

          });

          if (cancelled) return;

          setAgents((prev) => [defaultAgent, ...prev]);

          agentId = defaultAgent.id;

        } catch {

          // Agent creation failed ??show empty state

          return;

        }

      } else {

        agentId = agents[0].id;

      }



      if (!agentId || cancelled) return;

      setActiveAgentId(agentId);



      // 2. Fetch existing chats for this agent

      try {

        setAutoChatCreating(true);

        const existingChats = await agentApi.fetchChats(agentId);

        if (cancelled) return;



        if (existingChats.length > 0) {

          // Use the most recent chat

          setChats(existingChats);

          setActiveChatId(existingChats[0].id);

        } else {

          // 3. No chats ??create one automatically

          const newChat = await agentApi.createChat(agentId);

          if (cancelled) return;

          setChats([newChat]);

          setActiveChatId(newChat.id);

        }

      } catch (e) { console.warn('Unhandled error in InlineAiChat', e) } finally {

        if (!cancelled) setAutoChatCreating(false);

      }

    }



    autoInit();

    return () => { cancelled = true; };

  }, [agents, agentsLoading, agentsError, activeChatId]);



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

      // Silently handle ??errors are non-critical in inline view

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

      if (!cancelled) setMessagesError(err instanceof Error ? err.message : "메시지?불러?는???패?습?다.");

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



  useEffect(() => {

    if (streamMsg?.content) {

      try { navigator.vibrate?.(10); } catch (e) { console.warn('Unhandled error in InlineAiChat', e) }

    }

  }, [streamMsg?.content]);



  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);



  // ?? 발송?황 ?약 카드 ??

  useEffect(() => {

    let cancelled = false;

    const currentAccountId = selectedAccountId;

    setSummaryLoading(true);



    const headers = api.authHeaders();

    Promise.all([

      fetchWithTimeout(`${BASE_URL}/api/ai/usage?days=1`, { headers })

        .then((r) => r.json().catch(() => ({})))

        .then((data) => ({ kind: "usage" as const, data }))

        .catch(() => ({ kind: "usage" as const, data: {} })),

      selectedAccountId

        ? fetchWithTimeout(`${BASE_URL}/api/broadcasts?account_id=${selectedAccountId}&limit=100`, { headers })

            .then((r) => r.json().catch(() => ({})))

            .then((data) => ({ kind: "broadcast" as const, data }))

            .catch(() => ({ kind: "broadcast" as const, data: {} }))

        : Promise.resolve({ kind: "broadcast" as const, data: {} }),

    ]).then((results) => {

      if (cancelled) return;



      const usageData = results.find((r) => r.kind === "usage")?.data || {};

      const broadcastData = results.find((r) => r.kind === "broadcast")?.data || {};



      const features = usageData.features || {};

      const chat = features.chat || {};

      const broadcast = features.broadcast_assistant || {};



      const list = Array.isArray(broadcastData) ? broadcastData : (broadcastData.broadcasts || []);

      const sent = list.filter((b: any) => b.status === "sent").length;

      const failed = list.filter((b: any) => b.status === "failed").length;

      const scheduled = list.filter((b: any) => b.status === "pending" || b.status === "scheduled").length;



      setBroadcastSummary({

        sent: sent || chat.requests || 0,

        failed: failed || broadcast.requests || 0,

        scheduled,

      });



      if (failed > 0 || scheduled > 0) {

        useDashboardStore.getState().setTabBadge("send", failed + scheduled);

      }

    }).catch((e) => { console.error("[InlineAiChat] fetch agents summary ?패", e); toast("error", "발송 ?약 ?보?불러?? 못했?니??); }).finally(() => {

      if (!cancelled) setSummaryLoading(false);

    });



    return () => { cancelled = true; };

  }, [activeAgentId, selectedAccountId]);



  async function handleNewChat() {

    if (!activeAgentId) return;

    try {

      const c = await agentApi.createChat(activeAgentId);

      setChats((prev) => [c, ...prev]);

      setActiveChatId(c.id);

      setChatPanelOpen(false);

    } catch (e) { console.warn('Unhandled error in InlineAiChat', e) }

  }



  async function handleDeleteChat(chatId: string) {

    setDeletingChatId(chatId);

    try {

      await agentApi.deleteChat(chatId);

      setChats((prev) => {

        const next = prev.filter((c) => c.id !== chatId);

        if (activeChatId === chatId) setActiveChatId(next[0]?.id ?? null);

        return next;

      });

    } catch {

      toast("error", "채팅 ?? ?패");

    } finally {

      setDeletingChatId(null);

    }

  }



  function handleSelectChat(chatId: string) {

    setActiveChatId(chatId);

    setChatPanelOpen(false);

  }



  // ?? Quick prompts ??

  const quickPrompts = [

    { icon: BarChart3, label: "?늘 발송?황", text: "?늘 발송 ?황???약?줘" },

    { icon: AlertTriangle, label: "?패??발송", text: "최근 ?패??발송 ?역??인???려? },

    { icon: FileText, label: "최근 로그", text: "최근 24?간 발송 로그?분석?줘" },

    { icon: MessageSquare, label: "?장 추천", text: "?늘 ?어??메시지??????장??추천?줘" },

    { icon: Clock, label: "?약 ?황", text: "?재 ?약??발송 목록??보여? },

  ];



  function handleQuickPrompt(text: string) {

    sendMessageWithInput(text);

  }



  async function sendMessageWithInput(text: string) {

    if (!text || !activeChatId || loading) return;

    setInput("");

    try { navigator.vibrate?.(5); } catch (e) { console.warn('Unhandled error in InlineAiChat', e) }

    const userMsg: StreamMessage = { role: "user", content: text, tokensUsed: 0 };

    setMessages((prev) => [...prev, userMsg as agentApi.AgentMessage]);

    setLoading(true);



    const controller = new AbortController();

    abortRef.current = controller;



    fetchWithTimeout(`${BASE_URL}/api/ai/chats/${activeChatId}/message`, {

      method: "POST",

      headers: await api.authHeaders(),

      body: JSON.stringify({ content: text }),

      signal: controller.signal,

    }).then(async (res) => {

      if (!res.ok) {

        setStreamMsg({ role: "agent", content: "?버 ?류가 발생?습?다.", tokensUsed: 0 });

        return;

      }

      const data = await res.json();

      if (data.pending_confirmation) setPendingConfirmation(data.pending_confirmation);

      if (data.level_up && data.new_level) {

        toast("success", `? Lv.${data.new_level} ?성!`, {

          description: `${data.exp_gained || 0} EXP??득?습?다.`,

          duration: 5000,

        });

        agentApi.fetchAgents().then(setAgents).catch((e) => { console.error("[InlineAiChat] fetchAgents 갱신 ?패", e); toast("error", "Agent 목록 갱신???패?습?다"); });

      }

      const msgs = await agentApi.fetchChatMessages(activeChatId!);

      setMessages(msgs);

      setStreamMsg(null);

      try { navigator.vibrate?.(10); } catch (e) { console.warn('Unhandled error in InlineAiChat', e) }

    }).catch((err) => {

      if ((err as DOMException)?.name === "AbortError") return;

      setStreamMsg({ role: "agent", content: "?트?크 ?류가 발생?습?다.", tokensUsed: 0 });

    }).finally(() => {

      setLoading(false);

      abortRef.current = null;

    });

  }



  function sendMessage() {

    sendMessageWithInput(input.trim());

  }



  // ?? Voice input (long-press ??auto-send, short tap ??fill text) ??

  useEffect(() => {

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {

      setSpeechSupported(true);

      const recognition = new SpeechRecognition();

      recognition.lang = "ko-KR";

      recognition.interimResults = false;

      recognition.continuous = false;

      recognition.onresult = (event: any) => {

        const transcript = event.results[0][0].transcript;

        if (transcript) {

          if (isLongPressRef.current) {

            sendMessageWithInput(transcript);

          } else {

            setInput(transcript);

          }

        }

      };

      recognition.onerror = () => {

        setIsListening(false);

        isLongPressRef.current = false;

        toastRef.current("error", "?성 ?식 ?류");

      };

      recognition.onend = () => {

        setIsListening(false);

        isLongPressRef.current = false;

      };

      recognitionRef.current = recognition;

    }

  }, []);



  function handleVoicePointerDown() {

    if (!recognitionRef.current || loading) return;

    isLongPressRef.current = true;

    voiceTimerRef.current = setTimeout(() => {

      try { recognitionRef.current?.start(); } catch (e) { console.warn('Unhandled error in InlineAiChat', e) }

      setIsListening(true);

    }, 200);

  }



  function handleVoicePointerUp() {

    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);

    if (isListening && recognitionRef.current) {

      try { recognitionRef.current.stop(); } catch (e) { console.warn('Unhandled error in InlineAiChat', e) }

    }

    if (!isListening && voiceTimerRef.current) {

      isLongPressRef.current = false;

      try { recognitionRef.current?.start(); } catch (e) { console.warn('Unhandled error in InlineAiChat', e) }

      setIsListening(true);

    }

  }



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



  async function handleConfirmTool() {

    if (!pendingConfirmation || !activeChatId) return;

    setConfirmingTool(true);

    try {

      const result = await agentApi.confirmTool(

        activeChatId,

        pendingConfirmation.tool_name,

        pendingConfirmation.arguments,

      );

      // Reload messages

      const msgs = await agentApi.fetchChatMessages(activeChatId);

      setMessages(msgs);

      toast("success", `??${pendingConfirmation.label} ?행 ?료`, {

        description: typeof result.result === "object"

          ? JSON.stringify(result.result, null, 2).slice(0, 200)

          : "",

      });

    } catch (err) {

      toast("error", "?행 ?패", {

        description: err instanceof Error ? err.message : "?????는 ?류",

      });

    } finally {

      setPendingConfirmation(null);

      setConfirmingTool(false);

    }

  }



  function handleCancelConfirmation() {

    setPendingConfirmation(null);

  }



  function renderChatContent() {

    if (!activeAgentId) {

      return (

        <div className="flex flex-col items-center justify-center h-full gap-2 text-app-text-muted">

          <Sparkles className="h-8 w-8 opacity-30" />

          <p className="text-xs">Agent??택?고 ??? ?작?세??/p>

          <Button variant="primary" size="sm" onClick={() => setShowNewAgentModal(true)}>

            <Plus className="h-3 w-3" /> ??Agent

          </Button>

        </div>

      );

    }



    if (!activeChatId) {

      return (

        <div className="flex flex-col items-center justify-center h-full gap-2 text-app-text-muted">

          {autoChatCreating ? (

            <>

              <Loader2 className="h-6 w-6 animate-spin text-app-primary" />

              <p className="text-xs">채팅 준??..</p>

            </>

          ) : (

            <>

              <MessageSquare className="h-8 w-8 opacity-30" />

              <p className="text-xs">

                <span className="font-medium text-app-text">{activeAgent?.name}</span> ?

              </p>

              <Button variant="primary" size="sm" onClick={handleNewChat}>

                <Plus className="h-3 w-3" /> ??채팅

              </Button>

            </>

          )}

        </div>

      );

    }



    return (

      <>

        <AiWelcomeCard />

        <AiStaffBoard />

        <div className="space-y-3">

          {messagesLoading ? (

            <div className="space-y-3">

              {[1, 2].map((i) => (

                <div key={`iac-sk-${i}`} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>

                  <div className="space-y-1.5">

                    <Skeleton className="h-3 w-12 rounded" />

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

            <div className="flex flex-col items-center gap-4 py-6">

              <div className="w-full max-w-sm rounded-2xl border border-app-primary/20 bg-gradient-to-br from-app-primary/5 to-app-bg p-5 text-center">

                <Bot className="h-10 w-10 text-app-primary mx-auto mb-2" />

                <p className="text-sm font-bold text-app-text">{activeAgent?.name || "AI"} ?</p>

                <p className="text-xs text-app-text-muted mt-1">무엇?????릴까요? ??하??질문?보?요</p>

                {broadcastSummary && (

                  <div className="flex items-center justify-center gap-2 mt-3 text-[10px]">

                    <span className="flex items-center gap-0.5 text-app-success"><CheckCircle className="h-3 w-3" />{broadcastSummary.sent}??공</span>

                    {broadcastSummary.failed > 0 && (

                      <button onClick={() => handleQuickPrompt("?패??발송 ?인 분석?줘")} className="flex items-center gap-0.5 text-app-danger hover:underline">

                        <AlertTriangle className="h-3 w-3" />{broadcastSummary.failed}??패

                      </button>

                    )}

                    {broadcastSummary.scheduled > 0 && (

                      <span className="flex items-center gap-0.5 text-app-text-muted"><Clock className="h-3 w-3" />{broadcastSummary.scheduled}??약</span>

                    )}

                  </div>

                )}

                <div className="flex items-center justify-center gap-2 mt-3">

                  <button onClick={() => handleQuickPrompt("?늘 발송 ?황 ?약?줘")} className="rounded-full bg-app-primary/10 px-3 py-1.5 text-[11px] font-medium text-app-primary hover:bg-app-primary/20 transition-colors">? ?늘 리포??/button>

                  <button onClick={() => useDashboardStore.getState().setActiveTab("send")} className="rounded-full border border-app-border px-3 py-1.5 text-[11px] text-app-text-muted hover:border-app-primary/30 hover:text-app-text transition-colors">?️ ??발송 ?성</button>

                </div>

              </div>

              <p className="text-[10px] text-app-text-muted -mb-2">?주 묻는 질문</p>

              <div className="flex flex-wrap justify-center gap-1.5">

                {quickPrompts.map((qp) => (

                  <button key={qp.label} onClick={() => handleQuickPrompt(qp.text)} className="inline-flex items-center gap-1 rounded-full border border-app-border/60 bg-app-card-hover px-2.5 py-1 text-[11px] text-app-text-muted hover:border-app-primary/30 hover:text-app-primary transition-colors">

                    <qp.icon className="h-3 w-3" />{qp.label}

                  </button>

                ))}

              </div>

            </div>

          ) : (

            messages.map((m) => <ChatMessageBubble key={m.id} message={m} onExecuteTool={handleExecuteTool} />)

          )}



          {loading && !streamMsg?.content && (

            <div className="flex justify-start">

              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-app-border bg-app-card-hover px-3 py-2 text-xs text-app-text-muted">

                <Loader2 className="h-3.5 w-3.5 animate-spin" />?? ?성 ?..

              </div>

            </div>

          )}

          {streamMsg?.content && (

            <ChatMessageBubble message={{ id: "streaming", role: "agent", content: streamMsg.content, toolName: streamMsg.toolName, toolButtonLabel: streamMsg.toolButtonLabel, toolPayload: streamMsg.toolPayload, tokensUsed: streamMsg.tokensUsed, createdAt: "" }} onExecuteTool={handleExecuteTool} />

          )}

          <div ref={bottomRef} />

        </div>

      </>

    );

  }





  const activeAgent = agents.find((a) => a.id === activeAgentId);



  return (

    <div className="relative flex flex-col h-full min-h-0 sm:min-h-[400px] rounded-xl border border-app-border bg-app-card overflow-hidden">

      {/* Agent selector bar */}

      <div className="flex items-center gap-1.5 border-b border-app-border px-3 py-2 overflow-x-auto scrollbar-thin shrink-0">

        {/* 채팅 목록 버튼 */}

        {activeAgentId && chats.length > 0 && (

          <button

            onClick={() => setChatPanelOpen(true)}

            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"

            title="???목록"

          >

            <Menu className="h-3.5 w-3.5" />

          </button>

        )}

        {agentsLoading ? (

          <div className="flex gap-1.5">

            {[1, 2].map((i) => (

              <Skeleton key={`iac-sk2-${i}`} className="h-7 w-20 rounded-lg" />

            ))}

          </div>

        ) : agentsError && agents.length === 0 ? (

          <div className="flex items-center gap-1.5 truncate">

            <span className="text-xs text-app-danger truncate">{agentsError}</span>

            <button onClick={() => loadAgents()} className="shrink-0 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-app-primary hover:bg-app-primary/10 transition-colors">

              <RefreshCw className="h-3 w-3" /> ?시??
            </button>

          </div>

        ) : agents.length === 0 ? (

          <span className="text-xs text-app-text-muted truncate">Agent가 ?습?다</span>

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

              <Plus className="h-3 w-3" /> ??Agent

            </button>

          </>

        )}

      </div>



      {/* ?? Chat List Side Panel (left slide-in overlay) ?? */}

      {chatPanelOpen && (

        <>

          <div className="absolute inset-0 z-20 bg-black/30" onClick={() => setChatPanelOpen(false)} onKeyDown={(e) => { if (e.key === "Escape") setChatPanelOpen(false); }} tabIndex={-1} />

          <div className="absolute left-0 top-0 bottom-0 z-30 w-64 max-w-[80vw] bg-app-card border-r border-app-border flex flex-col shadow-xl transition-transform duration-300" style={{ transform: "translateX(0)", paddingLeft: "env(safe-area-inset-left, 0px)" }}>

            <div className="flex items-center justify-between border-b border-app-border px-3 py-2.5 shrink-0">

              <button

                onClick={() => setChatPanelOpen(false)}

                className="flex items-center gap-1 text-xs text-app-text-muted hover:text-app-text transition-colors"

              >

                <ChevronLeft className="h-3.5 w-3.5" />

                ?기

              </button>

              <button

                onClick={handleNewChat}

                className="flex items-center gap-1 rounded-lg bg-app-primary px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90 transition-opacity"

              >

                <Plus className="h-3 w-3" /> ??채팅

              </button>

            </div>

            <div className="flex-1 overflow-y-auto">

              {chatsLoading ? (

                <div className="space-y-1 p-2">

                {[1, 2, 3].map((i) => (

                  <Skeleton key={`iac-sk3-${i}`} className="h-10 w-full rounded-lg" />
                  ))}

                </div>

              ) : chats.length === 0 ? (

                <div className="flex flex-col items-center justify-center py-10 gap-2 text-app-text-muted">

                  <MessageSquare className="h-6 w-6 opacity-30" />

                  <p className="text-[11px]">???기록???습?다</p>

                </div>

              ) : (

                <div className="p-2 space-y-1">

                  {chats.map((chat) => (

                    <SwipeableRow

                      key={chat.id}

                      actions={[{

                        label: "??", color: "bg-app-danger",

                        icon: <Trash2 className="h-4 w-4" />,

                        onAction: () => handleDeleteChat(chat.id),

                      }]}

                    >

                    <button

                      onClick={() => handleSelectChat(chat.id)}

                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 cursor-pointer transition-colors group w-full text-left ${

                        activeChatId === chat.id

                          ? "bg-app-primary/10 border border-app-primary/20"

                          : "hover:bg-app-card-hover border border-transparent"

                      }`}

                    >

                        <div className="flex items-center gap-2">

                          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${activeChatId === chat.id ? "text-app-primary" : "text-app-text-muted"}`} />

                          <div className="min-w-0">

                            <p className="truncate text-xs font-medium text-app-text">

                              {chat.title || "?????}

                            </p>

                            <p className="text-[10px] text-app-text-muted">

                              {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}

                            </p>

        </div>

      </div>

      <FloatingAiButton />

                      </button>

                      <button

                        onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}

                        disabled={deletingChatId === chat.id}

                        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-app-text-muted hover:text-app-danger hover:bg-app-danger/10 transition-all disabled:opacity-50"

                      >

                        {deletingChatId === chat.id ? (

                          <Loader2 className="h-3 w-3 animate-spin" />

                        ) : (

                          <Trash2 className="h-3 w-3" />

                        )}

                      </button>

                    </SwipeableRow>

                  ))}

                </div>

              )}

            </div>

          </div>

        </>

      )}



      {/* ?? 발송?황 ?약 카드 ?? */}

      {activeChatId && broadcastSummary && !summaryLoading && (

        <div className="border-b border-app-border/40 bg-app-bg/30 px-3 py-2 shrink-0">

          <div className="flex items-center gap-3 text-[11px]">

            <span className="text-app-text-muted shrink-0">?늘</span>

            <button

              onClick={() => handleQuickPrompt("?늘 발송 ?황 ?세???려?)}

              className="flex items-center gap-1 text-app-success hover:underline"

            >

              <CheckCircle className="h-3 w-3" />{broadcastSummary.sent}??공

            </button>

            {broadcastSummary.failed > 0 && (

              <button

                onClick={() => handleQuickPrompt("?패??발송 ?인 분석?줘")}

                className="flex items-center gap-1 text-app-danger hover:underline"

              >

                <AlertTriangle className="h-3 w-3" />{broadcastSummary.failed}??패

              </button>

            )}

            {broadcastSummary.scheduled > 0 && (

              <span className="flex items-center gap-1 text-app-text-muted">

                <Clock className="h-3 w-3" />{broadcastSummary.scheduled}??약

              </span>

            )}

          </div>

        </div>

      )}



      {/* Chat messages */}

      <div className="flex-1 overflow-y-auto px-3 py-3">

        {renderChatContent()}

      </div>



      {/* Tool Confirmation Banner */}

      {pendingConfirmation && (

        <div className="border-t border-amber-500/30 bg-amber-500/5 px-3 py-2.5 shrink-0 animate-slide-up" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0px))" }}>

          <div className="flex items-start gap-2.5">

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20">

              <Sparkles className="h-3.5 w-3.5 text-amber-600" />

            </div>

            <div className="flex-1 min-w-0">

              <p className="text-xs font-semibold text-amber-700">

                ??{pendingConfirmation.label}

              </p>

              {pendingConfirmation.arguments && (pendingConfirmation.arguments as any).message ? (

                <p className="text-[11px] text-app-text-muted mt-0.5 truncate">

                  &ldquo;{String((pendingConfirmation.arguments as any).message).slice(0, 120)}&rdquo;

                </p>

              ) : null}

              {pendingConfirmation.arguments && (pendingConfirmation.arguments as any).account_id ? (

                <p className="text-[10px] text-app-text-muted mt-0.5">

                  계정: {String((pendingConfirmation.arguments as any).account_id).slice(0, 30)}

                </p>

              ) : null}

            </div>

            <div className="flex gap-1.5 shrink-0">

              <button

                type="button"

                onClick={handleCancelConfirmation}

                disabled={confirmingTool}

                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors disabled:opacity-50"

              >

                취소

              </button>

              <button

                type="button"

                onClick={handleConfirmTool}

                disabled={confirmingTool}

                className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1"

              >

                {confirmingTool ? <Loader2 className="h-3 w-3 animate-spin" /> : null}

                ?행

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ?? Send Preview Embed ?? */}

      {(() => {

        const sendMsg = useDashboardStore.getState().sendMessage;

        const sendGroups = useDashboardStore.getState().sendSelectedGroupIds;

        const accounts = useDashboardStore.getState().accounts;

        const selAcc = useDashboardStore.getState().selectedAccountId;

        if (!sendMsg.trim() && sendGroups.length === 0) return null;

        return (

          <div className="border-t border-app-primary/20 bg-app-primary-muted/5 px-3 py-2 shrink-0">

            <div className="flex items-center gap-2 text-[11px]">

              <PenLine className="h-3.5 w-3.5 text-app-primary shrink-0" />

              <div className="min-w-0 flex-1">

                <span className="font-medium text-app-text">발송 준??/span>

                {sendMsg.trim() && <span className="text-app-text-muted ml-1 truncate">&mdash; {sendMsg.slice(0, 30)}{sendMsg.length > 30 ? "..." : ""}</span>}

              </div>

              <span className="text-app-text-muted shrink-0">{sendGroups.length}?/span>

              <button

                type="button"

                onClick={() => useDashboardStore.getState().setActiveTab("send")}

                className="shrink-0 flex items-center gap-1 rounded-lg bg-app-primary/10 px-2 py-1 text-[11px] font-medium text-app-primary hover:bg-app-primary/20 transition-colors"

              >

                발송??<ExternalLink className="h-3 w-3" />

              </button>

            </div>

          </div>

        );

      })()}



      {/* Chat input */}

      {activeChatId && (

        <div className="border-t border-app-border px-3 pt-2 shrink-0" style={{ paddingBottom: `max(0.5rem, env(safe-area-inset-bottom, 0px))` }}>

          {/* Quick prompts row */}

          {messages.length > 0 && (

            <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-thin">

              {quickPrompts.map((qp) => (

                <button

                  key={qp.label}

                  onClick={() => handleQuickPrompt(qp.text)}

                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-app-border/60 px-3 py-1.5 text-[11px] text-app-text-muted hover:border-app-primary/30 hover:text-app-primary transition-colors min-h-[36px]"

                >

                  <qp.icon className="h-3.5 w-3.5" />

                  {qp.label}

                </button>

              ))}

            </div>

          )}

          <div className="flex gap-2">

            {/* Mic button ??long-press ??auto-send, short tap ??fill text */}

            {speechSupported && (

              <button

                type="button"

                onPointerDown={handleVoicePointerDown}

                onPointerUp={handleVoicePointerUp}

                onPointerLeave={handleVoicePointerUp}

                disabled={loading}

                className={`shrink-0 flex items-center justify-center h-10 w-10 rounded-xl border transition-all select-none ${

                  isListening

                    ? "border-app-danger bg-app-danger/10 text-app-danger animate-pulse"

                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-primary/40 hover:text-app-text"

                }`}

                title="길게 ?르?바로 ?송, 짧게 ?르??스???력"

              >

                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}

              </button>

            )}

            <input

              ref={inputRef}

              value={input}

              onChange={(e) => setInput(e.target.value)}

              onKeyDown={handleKeyDown}

              placeholder={`${activeAgent?.name || "Agent"}?게 메시지 보내?..`}

              disabled={loading}

              className="min-h-[40px] flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-app-text-muted/50 focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 disabled:opacity-50"

            />

            <Button variant="primary" onClick={sendMessage} loading={loading} disabled={!input.trim()} className="min-h-[40px] min-w-[40px]">

              <Send className="h-4 w-4" />

            </Button>

          </div>

        </div>

      )}



      {/* ?? FAB (Floating Action Button) ?? */}

      {activeChatId && messages.length > 0 && (

        <div className="absolute right-4 z-20" style={{ bottom: "max(7rem, calc(7rem + env(safe-area-inset-bottom, 0px)))" }}>

          {fabOpen && (

            <div className="flex flex-col gap-2 mb-2 animate-scale-in">

              <button

                onClick={() => { handleNewChat(); setFabOpen(false); }}

                className="flex items-center gap-2 rounded-xl bg-app-card border border-app-border shadow-lg px-3 py-2 text-xs text-app-text hover:bg-app-card-hover transition-colors whitespace-nowrap"

              >

                <Plus className="h-3.5 w-3.5 text-app-primary" />

                ??채팅

              </button>

              <button

                onClick={() => {

                  useDashboardStore.getState().setActiveTab("send");

                  setFabOpen(false);

                }}

                className="flex items-center gap-2 rounded-xl bg-app-card border border-app-border shadow-lg px-3 py-2 text-xs text-app-text hover:bg-app-card-hover transition-colors whitespace-nowrap"

              >

                <Send className="h-3.5 w-3.5 text-app-primary" />

                발송???기

              </button>

            </div>

          )}

          <button

            type="button"

            onClick={() => setFabOpen(!fabOpen)}

            className={`flex items-center justify-center h-11 w-11 rounded-full shadow-lg transition-all ${

              fabOpen

                ? "bg-app-border rotate-45"

                : "bg-app-primary text-white hover:opacity-90 active:scale-95"

            }`}

          >

            <Plus className="h-5 w-5" />

          </button>

        </div>

      )}

    </div>

  );

}

