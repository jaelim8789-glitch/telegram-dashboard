"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Send, Paperclip, Reply, X, ChevronLeft, CheckCheck, Check,
  Image as ImageIcon, FileText, Mic, CornerUpRight, MessageCircle,
  Loader2, ArrowDown, Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getToken } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface TelegramMessage {
  id: number;
  sender_id: number | null;
  sender_name: string | null;
  text: string;
  date: string | null;
  is_outgoing: boolean;
  reply_to_msg_id: number | null;
  reply_to_text: string | null;
  media_type: string | null;
  media_file_id: string | null;
  is_forwarded: boolean;
  forward_from_name: string | null;
}

interface TelegramChatViewProps {
  accountId: string;
  chatId: number;
  chatTitle: string;
  onBack: () => void;
  bookmarkedMessageIds?: Set<number>;
  onBookmark?: (msg: { id: number; text: string; sender_name: string | null; date: string | null; chat_id: number; chat_title: string }) => void;
  onRemoveBookmark?: (messageId: number) => void;
  typingUsers?: string[];
}

function MessageBubble({ msg, isConsecutive, isBookmarked, onToggleBookmark }: {
  msg: TelegramMessage;
  isConsecutive: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex mb-0.5",
        msg.is_outgoing ? "justify-end" : "justify-start",
        isConsecutive && "mt-0"
      )}
    >
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed group",
        msg.is_outgoing
          ? "bg-app-primary text-white rounded-br-md"
          : "bg-app-card border border-app-border text-app-text rounded-bl-md",
        isConsecutive && (msg.is_outgoing ? "rounded-tr-md" : "rounded-tl-md")
      )}>
        {/* Forwarded indicator */}
        {msg.is_forwarded && msg.forward_from_name && (
          <p className="text-[10px] font-medium text-app-text-muted mb-1">
            <CornerUpRight className="h-2.5 w-2.5 inline mr-0.5" />
            {msg.forward_from_name}???Íæ®Îññ ÔßéÎ∂ø?ÜÔßû?
          </p>
        )}

        {/* Reply indicator */}
        {msg.reply_to_msg_id && msg.reply_to_text && (
          <div className={cn(
            "mb-1.5 pl-2 border-l-2 rounded-sm text-xs py-0.5",
            msg.is_outgoing ? "border-white/40 text-white/70" : "border-app-primary/40 text-app-text-muted"
          )}>
            {msg.reply_to_text.slice(0, 80)}
          </div>
        )}

        {/* Media */}
        {msg.media_type === "photo" && (
          <div className="flex items-center gap-1.5 text-xs mb-1 opacity-70">
            <ImageIcon className="h-3 w-3" /> ??Ï≠?          </div>
        )}
        {msg.media_type === "document" && (
          <div className="flex items-center gap-1.5 text-xs mb-1 opacity-70">
            <FileText className="h-3 w-3" /> ???î™
          </div>
        )}

        {/* Message text */}
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>

        {/* Time + status */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-0.5",
          msg.is_outgoing ? "text-white/60" : "text-app-text-muted"
        )}>
          {!msg.is_outgoing && (
            <button onClick={onToggleBookmark} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Star className={cn("h-3 w-3", isBookmarked && "fill-yellow-400 text-yellow-400")} />
            </button>
          )}
          <span className="text-[10px]">{formatTime(msg.date)}</span>
          {msg.is_outgoing && (
            <button onClick={onToggleBookmark} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Star className={cn("h-3 w-3", isBookmarked && "fill-yellow-400 text-yellow-400")} />
            </button>
          )}
          {msg.is_outgoing && (
            <CheckCheck className="h-3 w-3" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function TelegramChatView({ accountId, chatId, chatTitle, onBack, bookmarkedMessageIds, onBookmark, onRemoveBookmark, typingUsers = [] }: TelegramChatViewProps) {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<TelegramMessage | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingStatus = useRef(false);
  const token = getToken();
  const authHeaders = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { toast } = useToast();

  // Load initial messages
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat-telegram/accounts/${accountId}/dialogs/${chatId}/messages?limit=50`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data.reverse());
    } catch (e) { console.warn('Unhandled error in TelegramChatView', e) } finally {
      setLoading(false);
    }
  }, [accountId, chatId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // SSE for real-time
  useEffect(() => {
    const url = `${API_BASE}/api/chat-telegram/accounts/${accountId}/dialogs/${chatId}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(), 100);
      } catch (e) { console.warn('Unhandled error in TelegramChatView', e) }
    });

    es.addEventListener("error", () => {
      // reconnection handled by EventSource automatically
    });

    return () => es.close();
  }, [accountId, chatId]);

  // Typing indicator API calls
  useEffect(() => {
    if (!input.trim()) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!lastTypingStatus.current) {
      lastTypingStatus.current = true;
      fetch(`${API_BASE}/api/chat-telegram/accounts/${accountId}/dialogs/${chatId}/typing`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ typing: true }),
      }).catch((e) => { console.error("[TelegramChatView] typing start fetch ??ΩÎô£", e); toast("error", "????ÑÎ∏® ?Í≥πÍπ≠ ?Íæ©ÎÑö????ΩÎô£??âÎíø??àÎñé"); });
    }
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingStatus.current = false;
      fetch(`${API_BASE}/api/chat-telegram/accounts/${accountId}/dialogs/${chatId}/typing`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ typing: false }),
      }).catch((e) => { console.error("[TelegramChatView] typing end fetch ??ΩÎô£", e); toast("error", "????ÑÎ∏® ?Í≥πÍπ≠ ?Íæ©ÎÑö????ΩÎô£??âÎíø??àÎñé"); });
    }, 2000);
  }, [input, accountId, chatId]);

  // Scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading, messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
  };

  // Send
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat-telegram/accounts/${accountId}/dialogs/${chatId}/send`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          text: input.trim(),
          reply_to_msg_id: replyTo?.id ?? null,
        }),
      });
      if (res.ok) {
        setInput("");
        setReplyTo(null);
        // Reload to get the sent message with proper ID
        setTimeout(loadMessages, 500);
      }
    } catch (e) { console.warn('Unhandled error in TelegramChatView', e) } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddBookmark = useCallback(async (msg: TelegramMessage) => {
    try {
      const res = await fetch(`${API_BASE}/api/chat-telegram/bookmarks`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          message_id: msg.id,
          chat_id: chatId,
          chat_title: chatTitle,
          text: msg.text,
          sender_name: msg.sender_name,
          date: msg.date,
        }),
      });
      if (res.ok) {
        onBookmark?.({
          id: msg.id,
          text: msg.text,
          sender_name: msg.sender_name,
          date: msg.date,
          chat_id: chatId,
          chat_title: chatTitle,
        });
      }
    } catch (e) { console.warn('Unhandled error in TelegramChatView', e) }
  }, [accountId, chatId, chatTitle, authHeaders, onBookmark]);

  const handleRemoveBookmark = useCallback(async (messageId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/chat-telegram/bookmarks/${messageId}?chat_id=${chatId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        onRemoveBookmark?.(messageId);
      }
    } catch (e) { console.warn('Unhandled error in TelegramChatView', e) }
  }, [accountId, chatId, authHeaders, onRemoveBookmark]);

  const handleToggleBookmark = useCallback((msg: TelegramMessage) => {
    if (bookmarkedMessageIds?.has(msg.id)) {
      handleRemoveBookmark(msg.id);
    } else {
      handleAddBookmark(msg);
    }
  }, [bookmarkedMessageIds, handleAddBookmark, handleRemoveBookmark]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-app-border px-3 py-2.5">
        <button onClick={onBack} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-app-card-hover transition-colors">
          <ChevronLeft className="h-4 w-4 text-app-text" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-app-primary/10 text-app-primary">
          <span className="text-sm font-bold">{chatTitle.charAt(0)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-app-text truncate">{chatTitle}</h3>
          <p className="text-[10px] text-app-text-muted">{messages.length}Â™õÏíñ??ÔßéÎ∂ø?ÜÔßû?</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-app-text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-app-text-muted">
            <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">ÔßéÎ∂ø?ÜÔßû?Â™õ¬Ä ??ÅÎíø??àÎñé</p>
            <p className="text-xs mt-1">Ôß?ÔßéÎ∂ø?ÜÔßû???ËπÇÎ?Í∂°ËπÇ?ÅÍΩ≠??</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const prev = i > 0 ? messages[i - 1] : null;
              const isConsecutive = !!(prev && prev.is_outgoing === msg.is_outgoing && prev.sender_id === msg.sender_id);
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isConsecutive={isConsecutive}
                  isBookmarked={bookmarkedMessageIds?.has(msg.id) ?? false}
                  onToggleBookmark={() => handleToggleBookmark(msg)}
                />
              );
            })}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-app-text-muted">
                <div className="flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-app-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-app-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-app-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>{typingUsers.join(", ")}{typingUsers.length === 1 ? "??èÏî†" : "??èÏî†"} ??ÖÏ†∞ ‰ª?..</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll down button */}
      {showScrollDown && (
        <button onClick={scrollToBottom} className="absolute bottom-20 right-6 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-app-primary shadow-lg text-white hover:bg-app-primary-hover transition-colors">
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-app-border bg-app-card px-3 py-2">
          <CornerUpRight className="h-3.5 w-3.5 shrink-0 text-app-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-app-primary">?åÏã† ?Ä??/p>
            <p className="truncate text-xs text-app-text-muted">{replyTo.text.slice(0, 100)}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-app-card-hover">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-app-border px-3 py-2.5">
        <div className="flex items-end gap-2">
          <button className="shrink-0 flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-app-card-hover transition-colors">
            <Paperclip className="h-4 w-4 text-app-text-muted" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ÔßéÎ∂ø?ÜÔßû? ??ÖÏ†∞..."
              rows={1}
              className="w-full resize-none rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary max-h-32"
              style={{ minHeight: "36px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-app-primary text-white hover:bg-app-primary-hover disabled:opacity-40 transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
