"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Plus, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

interface Conv { id: string; title: string; updated_at: string }
interface Msg { id: string; role: string; content: string; created_at: string }

const API = process.env.NEXT_PUBLIC_API_URL || "";

function token() { return localStorage.getItem("access_token") || "" }

export function AiChatTab() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/chat/conversations`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setConvs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeConvId) { setMsgs([]); return }
    fetch(`${API}/api/chat/conversations/${activeConvId}/messages`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => r.json()).then(setMsgs).catch(() => {});
  }, [activeConvId]);

  useEffect(() => { bottomRef.current?.scrollIntoView() }, [msgs]);

  async function newConv() {
    const r = await fetch(`${API}/api/chat/conversations`, {
      method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    });
    const c: Conv = await r.json();
    setConvs(prev => [c, ...prev]);
    setActiveConvId(c.id);
  }

  async function delConv(id: string) {
    await fetch(`${API}/api/chat/conversations/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    setConvs(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) setActiveConvId(null);
  }

  async function send() {
    if (!input.trim() || !activeConvId || loading) return;
    const q = input; setInput("");
    setMsgs(prev => [...prev, { id: "tmp", role: "user", content: q, created_at: "" }]);
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/chat/conversations/${activeConvId}/ask`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await r.json();
      setMsgs(prev => prev.filter(m => m.id !== "tmp"));
      // reload full message list to get both user and assistant with real ids
      const res = await fetch(`${API}/api/chat/conversations/${activeConvId}/messages`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setMsgs(await res.json());
      // refresh conv list (title may have updated)
      const cres = await fetch(`${API}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setConvs(await cres.json());
    } catch { setLoading(false) }
    setLoading(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-3">
      {/* 왼쪽 대화목록 */}
      <div className="w-60 shrink-0 flex flex-col gap-2">
        <Button variant="primary" size="sm" onClick={newConv} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> 새 대화
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {convs.map(c => (
            <div key={c.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer text-xs ${
                activeConvId === c.id ? "bg-app-primary/10 text-app-primary" : "hover:bg-app-card-hover"
              }`}
              onClick={() => setActiveConvId(c.id)}
            >
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{c.title}</span>
              <button onClick={e => { e.stopPropagation(); delConv(c.id) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-app-danger hover:bg-app-danger-muted rounded">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 채팅창 */}
      <div className="flex-1 flex flex-col rounded-xl border border-app-border bg-app-card">
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-app-text-muted">
            대화를 선택하거나 새로 만드세요
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map(m => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-app-card-hover rounded-xl px-3 py-2 text-sm text-app-text-muted flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> 생각 중...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-app-border p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-app-primary"
                />
                <Button variant="primary" size="sm" onClick={send} loading={loading}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}