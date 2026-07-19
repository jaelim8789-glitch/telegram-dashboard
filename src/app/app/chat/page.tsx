"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Plus, Trash2, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Conv { id: string; title: string; updated_at: string }
interface Msg { id: string; role: string; content: string; created_at: string }

const API = process.env.NEXT_PUBLIC_API_URL || "";
const token = () => localStorage.getItem("access_token") || "";

export default function ChatPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/chat/conversations`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setConvs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeId) { setMsgs([]); return }
    fetch(`${API}/api/chat/conversations/${activeId}/messages`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => r.json()).then(setMsgs).catch(() => {});
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs]);

  async function newConv() {
    const r = await fetch(`${API}/api/chat/conversations`, {
      method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    });
    const c: Conv = await r.json();
    setConvs(prev => [c, ...prev]);
    setActiveId(c.id);
  }

  async function delConv(id: string) {
    await fetch(`${API}/api/chat/conversations/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    setConvs(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function send() {
    if (!input.trim() || !activeId || loading) return;
    const q = input; setInput("");
    setLoading(true);
    try {
      await fetch(`${API}/api/chat/conversations/${activeId}/ask`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const res = await fetch(`${API}/api/chat/conversations/${activeId}/messages`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setMsgs(await res.json());
      const cres = await fetch(`${API}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setConvs(await cres.json());
    } catch {}
    setLoading(false);
  }

  return (
    <div className="flex h-screen bg-app-bg">
      {/* 사이드바 */}
      <div className={`${showSidebar ? "w-64" : "w-0"} transition-all duration-200 border-r border-app-border bg-app-card flex flex-col shrink-0 overflow-hidden`}>
        <div className="p-3 border-b border-app-border flex items-center justify-between">
          <span className="text-sm font-semibold text-app-text">대화 목록</span>
          <button onClick={() => setShowSidebar(false)} className="text-app-text-muted hover:text-app-text p-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <Button variant="primary" size="sm" onClick={newConv} className="w-full">
            <Plus className="h-3.5 w-3.5" /> 새 대화
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {convs.map(c => (
            <div key={c.id}
              className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-2 cursor-pointer text-xs ${
                activeId === c.id ? "bg-app-primary/10 text-app-primary" : "hover:bg-app-card-hover text-app-text"
              }`}
              onClick={() => setActiveId(c.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{c.title}</span>
              <button onClick={e => { e.stopPropagation(); delConv(c.id) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-app-danger hover:bg-app-danger-muted rounded">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 메인 채팅 */}
      <div className="flex-1 flex flex-col">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-app-text-muted">
            {!showSidebar && (
              <button onClick={() => setShowSidebar(true)} className="text-xs text-app-primary hover:underline">
                사이드바 열기
              </button>
            )}
            <MessageSquare className="h-12 w-12 opacity-30" />
            <p className="text-sm">대화를 선택하거나 새로 만드세요</p>
            <Button variant="primary" size="sm" onClick={newConv}>
              <Plus className="h-3.5 w-3.5" /> 새 대화 시작
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-app-border px-4 py-2.5 flex items-center gap-2">
              {!showSidebar && (
                <button onClick={() => setShowSidebar(true)} className="text-app-text-muted hover:text-app-text p-1">
                  <MessageSquare className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm font-medium text-app-text truncate">
                {convs.find(c => c.id === activeId)?.title || "대화"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {msgs.map(m => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-app-primary text-white rounded-br-md"
                      : "bg-app-card-hover text-app-text rounded-bl-md border border-app-border"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-app-card-hover border border-app-border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-app-text-muted flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 답변 생성 중...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-app-border p-3 bg-app-card">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 rounded-xl border border-app-border bg-app-bg px-4 py-2.5 text-sm outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30"
                />
                <Button variant="primary" onClick={send} loading={loading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}