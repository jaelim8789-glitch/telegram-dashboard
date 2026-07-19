"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Plus, Trash2, MessageSquare, Loader2, Pencil, Check, X, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Conv { id: string; title: string; updated_at: string }
interface Msg { id: string; role: string; content: string; created_at: string }

const API = process.env.NEXT_PUBLIC_API_URL || "";
const token = () => localStorage.getItem("access_token") || "";
let abortCtrl: AbortController | null = null;

function ChatUI({ standalone }: { standalone?: boolean }) {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadConvs() }, []);
  useEffect(() => {
    if (!activeId) { setMsgs([]); return }
    fetch(`${API}/api/chat/conversations/${activeId}/messages`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setMsgs).catch(() => {});
  }, [activeId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, streamingMsg]);

  async function loadConvs() {
    const url = searchQ ? `${API}/api/chat/conversations?search=${encodeURIComponent(searchQ)}` : `${API}/api/chat/conversations`;
    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setConvs).catch(() => {});
  }

  async function newConv() {
    const r = await fetch(`${API}/api/chat/conversations`, {
      method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    });
    const c: Conv = await r.json();
    setConvs(prev => [c, ...prev]);
    setActiveId(c.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function delConv(id: string) {
    await fetch(`${API}/api/chat/conversations/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    setConvs(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function saveTitle(id: string) {
    if (!editTitle.trim()) return;
    await fetch(`${API}/api/chat/conversations/${id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle }),
    });
    setConvs(prev => prev.map(c => c.id === id ? { ...c, title: editTitle } : c));
    setEditingId(null);
  }

  async function send() {
    if (!input.trim() || !activeId || loading) return;
    const q = input; setInput(""); setStreamingMsg("");

    // 낙관적 UI 업데이트
    setMsgs(prev => [...prev, { id: "tmp", role: "user", content: q, created_at: "" }]);
    setLoading(true);

    try {
      const r = await fetch(`${API}/api/chat/conversations/${activeId}/ask`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await r.json();
      const res = await fetch(`${API}/api/chat/conversations/${activeId}/messages`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setMsgs(await res.json());
      loadConvs();
    } catch {} finally { setLoading(false) }
  }

  async function sendStream() {
    if (!input.trim() || !activeId || loading) return;
    const q = input; setInput(""); setStreamingMsg("");
    setMsgs(prev => [...prev, { id: "tmp", role: "user", content: q, created_at: "" }]);
    setLoading(true);

    abortCtrl = new AbortController();
    try {
      const r = await fetch(`${API}/api/chat/conversations/${activeId}/ask/stream`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: abortCtrl.signal,
      });
      const reader = r.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n").filter(Boolean)) {
          try {
            const data = JSON.parse(line);
            if (data.token) { full += data.token; setStreamingMsg(full) }
            if (data.done) {
              setMsgs(prev => [...prev.filter(m => m.id !== "tmp"), { id: "done", role: "assistant", content: data.full, created_at: "" }]);
              setStreamingMsg("");
              loadConvs();
            }
          } catch {}
        }
      }
    } catch {} finally { setLoading(false); abortCtrl = null }
  }

  return (
    <div className={`flex ${standalone ? "h-screen" : "h-[calc(100vh-8rem)]"} gap-0 overflow-hidden`}>
      {/* 사이드바 */}
      <div className={`${sidebarOpen ? "w-60" : "w-0"} transition-all duration-200 shrink-0 border-r border-app-border bg-app-card flex flex-col ${standalone ? "" : "hidden sm:flex"}`}>
        <div className="p-2.5 space-y-2">
          <Button variant="primary" size="sm" onClick={newConv} className="w-full">
            <Plus className="h-3.5 w-3.5" /> 새 대화
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-app-text-muted" />
            <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setTimeout(loadConvs, 300) }}
              placeholder="대화 검색..." className="w-full rounded-lg border border-app-border bg-app-bg pl-7 pr-2 py-1.5 text-xs outline-none focus:border-app-primary" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
          {convs.map(c => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer text-xs ${activeId === c.id ? "bg-app-primary/10 text-app-primary" : "hover:bg-app-card-hover"}`}
              onClick={() => { setActiveId(c.id); if (standalone && window.innerWidth < 640) setSidebarOpen(false) }}>
              <MessageSquare className="h-3 w-3 shrink-0" />
              {editingId === c.id ? (
                <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    className="flex-1 bg-app-bg border border-app-border rounded px-1 py-0.5 text-xs outline-none"
                    autoFocus onKeyDown={e => { if (e.key === "Enter") saveTitle(c.id); if (e.key === "Escape") setEditingId(null) }} />
                  <button onClick={() => saveTitle(c.id)} className="p-0.5 text-app-success"><Check className="h-3 w-3" /></button>
                  <button onClick={() => setEditingId(null)} className="p-0.5 text-app-danger"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <span className="truncate flex-1">{c.title}</span>
              )}
              {editingId !== c.id && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button onClick={e => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title) }}
                    className="p-0.5 text-app-text-muted hover:text-app-text rounded"><Pencil className="h-3 w-3" /></button>
                  <button onClick={e => { e.stopPropagation(); delConv(c.id) }}
                    className="p-0.5 text-app-danger hover:bg-app-danger-muted rounded"><Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 채팅영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-app-text-muted p-4">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="text-xs text-app-primary">사이드바 열기</button>}
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm">대화를 선택하거나 새로 만드세요</p>
            <Button variant="primary" size="sm" onClick={newConv}><Plus className="h-3.5 w-3.5" /> 새 대화 시작</Button>
          </div>
        ) : (
          <>
            <div className="border-b border-app-border px-3 py-2 flex items-center gap-2 shrink-0">
              {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="sm:hidden p-1 text-app-text-muted"><MessageSquare className="h-4 w-4" /></button>}
              <span className="text-sm font-medium text-app-text truncate flex-1">{convs.find(c => c.id === activeId)?.title}</span>
              {standalone && (
                <a href="/app" className="text-xs text-app-primary hover:underline shrink-0">대시보드 →</a>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {msgs.filter(m => m.id !== "tmp").map(m => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-app-primary text-white rounded-br-md" : "bg-app-card-hover text-app-text rounded-bl-md border border-app-border"
                  }`}>{m.content}</div>
                </div>
              ))}
              {streamingMsg && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] sm:max-w-[70%] bg-app-card-hover border border-app-border rounded-2xl rounded-bl-md px-3.5 py-2 text-sm text-app-text whitespace-pre-wrap">{streamingMsg}</div>
                </div>
              )}
              {loading && !streamingMsg && (
                <div className="flex justify-start">
                  <div className="bg-app-card-hover border border-app-border rounded-2xl rounded-bl-md px-3.5 py-2 text-sm text-app-text-muted flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> 생각 중...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-app-border p-2.5 bg-app-card shrink-0">
              <div className="flex gap-2 max-w-3xl mx-auto">
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (input.includes("?") ? send() : sendStream())}
                  placeholder="메시지를 입력하세요... (Enter: 스트리밍)" disabled={loading}
                  className="flex-1 rounded-xl border border-app-border bg-app-bg px-3.5 py-2 text-sm outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 disabled:opacity-50" />
                <Button variant="primary" onClick={() => sendStream()} loading={loading} disabled={loading || !input.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AiChatTab() { return <ChatUI standalone={false} /> }