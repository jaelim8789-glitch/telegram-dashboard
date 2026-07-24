"use client";

import { useState, memo, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Sparkles, Loader2, Mic, MicOff, Bookmark, BookmarkCheck, ArrowRight, Copy, CheckCheck, Bot, Plus } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useToastStore } from "@/components/ui/GlobalToast";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { sendChatMessage, fetchChatMessages, fetchAgents, createChat } from "@/lib/agent-api";
import type { Agent, AgentChat, AgentMessage } from "@/lib/agent-api";

let hapticFeedback: any = null;
if (typeof window !== "undefined") {
  import("@tma.js/sdk-react").then(m => { hapticFeedback = m.hapticFeedback; }).catch(() => {});
}

interface Message { role: "user" | "agent"; content: string; id: string; bookmarked?: boolean; }

const QUICK_PROMPTS = [
  { label: "?¤ëŠ˜ ?”ì•½", prompt: "?¤ëŠ˜ ë°œì†¡ ?„í™© ?Œë ¤ì¤?, icon: "?“Š" },
  { label: "ê³„ì • ?íƒœ", prompt: "ê³„ì • ê±´ê°• ?íƒœ??", icon: "?¤ï¸" },
  { label: "?¤íŒ¨ ë¶„ì„", prompt: "ìµœê·¼ ë°œì†¡ ?¤íŒ¨??ê±??ˆì–´?", icon: "?? },
  { label: "ë°œì†¡ ?‘ì„±", prompt: "??ë§ˆì???ì¹´í”¼ ?‘ì„±?´ì¤˜", icon: "?ï¸" },
];

interface ChatHistory { messages: Message[]; chatId: string | null; agentId: string | null; }
const useChatStore = create<ChatHistory>()(persist(() => ({ messages: [], chatId: null, agentId: null }), { name: "telemon-miniapp-chat" }));

function getContextualGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "??? ?œê°„ê¹Œì? ê³ ìƒ?˜ì‹œ?¤ìš”! ?¤ëŠ˜ ë°œì†¡ ?„í™©???Œë ¤?œë¦´ê¹Œìš”?";
  if (h < 12) return "ì¢‹ì? ?„ì¹¨?…ë‹ˆ?? ?¤ëŠ˜??ë°œì†¡ ?„í™©???•ì¸?´ë³´?¸ìš”.";
  if (h < 18) return "?ˆë…•?˜ì„¸?? TeleMon AI?…ë‹ˆ?? ë¬´ì—‡???„ì??œë¦´ê¹Œìš”?";
  return "?€???œê°„?…ë‹ˆ?? ?¤ëŠ˜ ?˜ë£¨ ë°œì†¡ ?„í™©???”ì•½?´ë“œë¦´ê¹Œ??";
}

const ChatBubble = memo(function ChatBubble({ msg, onCopy, onBookmark }: { msg: Message; onCopy: (text: string) => void; onBookmark: (id: string) => void }) {
  const isUser = msg.role === "user";
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className="relative max-w-[85%]">
        <div className={`rounded-2xl px-4 py-2.5 text-sm ${isUser ? "rounded-br-md" : "rounded-bl-md"}`}
          style={{ backgroundColor: isUser ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-section-bg-color, #232e3c)", color: isUser ? "#fff" : "var(--tg-theme-text-color)" }}
          onContextMenu={e => { e.preventDefault(); setShowMenu(prev => !prev); }}>
          {msg.content}
        </div>
        {showMenu && (
          <div className="absolute top-full mt-1 z-10 rounded-xl p-1 shadow-lg" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
            <button onClick={() => { onCopy(msg.content); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)]" style={{ color: "var(--tg-theme-text-color)" }}>
              <Copy className="h-3.5 w-3.5" /> ë³µì‚¬
            </button>
            <button onClick={() => { onBookmark(msg.id); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)]" style={{ color: "var(--tg-theme-text-color)" }}>
              {msg.bookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-400" /> : <Bookmark className="h-3.5 w-3.5" />} ë¶ë§ˆ??
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md px-4 py-3 text-sm" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color, #708499)" }}>
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "200ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any; }
}
const SpeechRecognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;

export const MiniAppChat = memo(function MiniAppChat() {
  const savedMessages = useChatStore(s => s.messages);
  const savedChatId = useChatStore(s => s.chatId);
  const savedAgentId = useChatStore(s => s.agentId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(savedChatId);
  const [agentId, setAgentId] = useState<string | null>(savedAgentId);
  const [initLoading, setInitLoading] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // ì´ˆê¸°?? ?ì´?„íŠ¸ + ì±„íŒ… ?ì„±
  useEffect(() => {
    async function init() {
      try {
        let aid = agentId;
        if (!aid) {
          const agents = await fetchAgents();
          if (agents.length > 0) aid = agents[0].id;
          else {
            const demo = await fetch("/api/ai/agents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "TeleMon AI", role: "assistant",
                systemPrompt: "?¹ì‹ ?€ TeleMon ë¯¸ë‹ˆ?±ì˜ AI ?´ì‹œ?¤í„´?¸ì…?ˆë‹¤. ?¬ìš©?ì˜ ì§ˆë¬¸??ê°„ê²°?˜ê³  ?„ì????˜ëŠ” ?µë????œêµ­?´ë¡œ ?œê³µ?˜ì„¸?? ë°œì†¡ ê´€??ì§ˆë¬¸?´ë©´ êµ¬ì²´?ìœ¼ë¡??ˆë‚´?´ì£¼?¸ìš”.",
              }),
            }).then(r => r.json()).catch(() => null);
            if (demo?.id) aid = demo.id;
          }
          if (aid) setAgentId(aid);
        }

        let cid = chatId;
        if (aid && !cid) {
          const chat = await createChat(aid, "ë¯¸ë‹ˆ??ì±„íŒ…");
          if (chat?.id) { cid = chat.id; setChatId(cid); }
        }

        if (cid) {
          const msgs = await fetchChatMessages(cid);
          if (msgs.length > 0) {
            setMessages(msgs.map(m => ({ role: m.role, content: m.content, id: m.id, bookmarked: false })));
          } else {
            setMessages([{ role: "agent", content: getContextualGreeting(), id: "welcome" }]);
          }
        } else {
          setMessages([{ role: "agent", content: getContextualGreeting(), id: "welcome" }]);
        }
      } catch { setMessages([{ role: "agent", content: "?°ê²° ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.", id: "welcome" }]); }
      setInitLoading(false);
    }
    init();
  }, []);

  // ?íƒœ ?€??
  useEffect(() => { useChatStore.setState({ messages, chatId, agentId }); }, [messages, chatId, agentId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, id: `u-${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try { hapticFeedback?.notificationOccurred("success"); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }

    try {
      // 1. ì±„íŒ…???†ìœ¼ë©??ì„±
      let cid = chatId;
      if (!cid) {
        const aid = agentId;
        if (!aid) throw new Error("no agent");
        const chat = await createChat(aid, "ë¯¸ë‹ˆ??ì±„íŒ…");
        if (chat?.id) { cid = chat.id; setChatId(cid); }
        else throw new Error("chat creation failed");
      }

      // 2. ?¤ì œ API ?¸ì¶œ (DeepSeek ??stream)
      const response = await sendChatMessage(cid, text);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 3. SSE ?¤íŠ¸ë¦¬ë° ?‘ë‹µ ì²˜ë¦¬
      const reader = response.body?.getReader();
      if (!reader) throw new Error("no reader");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.choices?.[0]?.delta?.content || parsed.content || "";
              if (chunk) accumulated += chunk;
            } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
          }
        }

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "agent" && last.id.startsWith("stream-")) {
            return [...prev.slice(0, -1), { ...last, content: accumulated }];
          }
          return [...prev, { role: "agent", content: accumulated, id: `stream-${Date.now()}` }];
        });
      }

      // ?¤íŠ¸ë¦¬ë° ?„ë£Œ ??ìµœì¢… ë©”ì‹œì§€ ?•ì •
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id.startsWith("stream-")) {
          return [...prev.slice(0, -1), { role: "agent", content: last.content, id: `a-${Date.now()}` }];
        }
        return prev;
      });
    } catch (err) {
      useToastStore.getState().add({ type: "error", title: "AI ?‘ë‹µ ?¤íŒ¨", message: "?¤ì‹œ ?œë„?´ì£¼?¸ìš”" });
      setMessages(prev => [...prev, { role: "agent", content: "ì£„ì†¡?©ë‹ˆ?? ?‘ë‹µ???ì„±?˜ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", id: `a-${Date.now()}` }]);
    }
    setLoading(false);
  }, [loading, chatId, agentId]);

  const handleCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); useToastStore.getState().add({ type: "success", title: "ë³µì‚¬?? }); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
  }, []);

  const handleBookmark = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, bookmarked: !m.bookmarked } : m));
    try { hapticFeedback?.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (!SpeechRecognition) { useToastStore.getState().add({ type: "info", title: "??ë¸Œë¼?°ì????Œì„± ?…ë ¥??ì§€?í•˜ì§€ ?ŠìŠµ?ˆë‹¤" }); return; }
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; return; }
    try {
      const r = new SpeechRecognition();
      r.lang = "ko-KR"; r.interimResults = false;
      r.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); handleSend(t); };
      r.onend = () => { recognitionRef.current = null; };
      r.start(); recognitionRef.current = r;
      try { hapticFeedback?.impactOccurred("medium"); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
    } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
  }, [handleSend]);

  const handleSendRedirect = useCallback(() => {
    window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab: "send" } }));
  }, []);

  const bookmarkedCount = useMemo(() => messages.filter(m => m.bookmarked).length, [messages]);

  if (initLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
        <p className="text-xs mt-2" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>AI ?°ê²° ì¤?..</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"><Sparkles className="h-4 w-4 text-white" /></div>
        <div className="flex-1"><h2 className="text-sm font-bold">AI ?´ì‹œ?¤í„´??/h2><p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>DeepSeek AI Â· SSE ?¤íŠ¸ë¦¬ë°</p></div>
        {bookmarkedCount > 0 && (
          <div className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
            <BookmarkCheck className="h-3 w-3 text-amber-400" /> {bookmarkedCount}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-label="ì±„íŒ… ë©”ì‹œì§€">
        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} onCopy={handleCopy} onBookmark={handleBookmark} />)}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-4 mb-3 shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(q => (
              <button key={q.label} onClick={() => handleSend(q.prompt)} disabled={loading}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>
                <span>{q.icon}</span>{q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 shrink-0">
        <div className="flex gap-2">
          {SpeechRecognition && (
            <button onClick={handleVoiceToggle} className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95"
              style={{ backgroundColor: recognitionRef.current ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-section-bg-color, #232e3c)" }}
              aria-label="?Œì„± ?…ë ¥">
              {recognitionRef.current ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5" style={{ color: "var(--tg-theme-hint-color)" }} />}
            </button>
          )}
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="DeepSeek AI??ì§ˆë¬¸?˜ì„¸??.." autoComplete="off" aria-label="ë©”ì‹œì§€ ?…ë ¥"
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-text-color)", border: "1px solid var(--tg-theme-hint-color, #708499)" }} />
          <button onClick={() => handleSend(input)} disabled={!input.trim() || loading}
            className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }} aria-label="ë©”ì‹œì§€ ?„ì†¡">
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {messages.length <= 2 && (
        <button onClick={handleSendRedirect} className="mx-4 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium active:scale-[0.98]"
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
          <Send className="h-3.5 w-3.5" /> ë°œì†¡ ??œ¼ë¡??´ë™
        </button>
      )}
    </div>
  );
});
