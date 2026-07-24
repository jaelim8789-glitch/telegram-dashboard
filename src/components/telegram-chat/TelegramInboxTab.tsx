"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Smartphone, RefreshCw, Loader2, Users, Search, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { DialogList } from "./DialogList";
import { SmartFolders } from "./SmartFolders";
import { TelegramChatView } from "./TelegramChatView";
import { InlineError } from "@/components/ui/InlineError";
import { Panel } from "@/components/ui/Panel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { getToken } from "@/lib/auth";
import { useDashboardStore } from "@/store/useDashboardStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface Dialog {
  id: number;
  title: string;
  type: "private" | "group" | "megagroup" | "channel";
  unread_count: number;
  last_message: string | null;
  last_message_date: string | null;
  pinned: boolean;
  participants_count: number;
}

export function TelegramInboxTab() {
  const { toast } = useToast();
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [folderDialogIds, setFolderDialogIds] = useState<Set<number>>(new Set());
  const token = getToken();
  const authHeaders = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const displayDialogs = useMemo(() => {
    let base: Dialog[] = searchResults.length > 0
      ? searchResults.map((r) => ({
          id: r.chat_id,
          title: r.chat_title || "",
          type: "private" as const,
          unread_count: 0,
          last_message: r.text || r.message || "",
          last_message_date: r.date || null,
          pinned: false,
          participants_count: 0,
        }))
      : dialogs;
    if (folderFilter && folderDialogIds.size > 0) {
      base = base.filter((d) => folderDialogIds.has(d.id));
    }
    return base;
  }, [dialogs, searchResults, folderFilter, folderDialogIds]);

  const activeChat = displayDialogs.find((d) => d.id === activeChatId);

  useEffect(() => {
    if (!activeAccountId && accounts.length > 0) {
      setActiveAccountId(selectedAccountId || accounts[0].id);
    }
  }, [accounts, activeAccountId, selectedAccountId]);

  const loadDialogs = useCallback(async () => {
    if (!activeAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/chat-telegram/accounts/${activeAccountId}/dialogs`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("?�?�방??불러?????�습?�다");
      const data = await res.json();
      setDialogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 ?�패");
    } finally {
      setLoading(false);
    }
  }, [activeAccountId]);

  useEffect(() => { if (activeAccountId) loadDialogs(); }, [loadDialogs, activeAccountId]);

  const loadBookmarks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat-telegram/bookmarks`, { headers: authHeaders });
      if (res.ok) setBookmarks(await res.json());
    } catch (e) { console.warn('Unhandled error in TelegramInboxTab', e) }
  }, []);

  useEffect(() => { loadBookmarks(); }, []);

  const handleMessageSearch = async (query: string) => {
    if (!activeAccountId || !query.trim()) { setSearchResults([]); return; }
    setSearchQuery(query);
    try {
      const res = await fetch(`${API_BASE}/api/chat-telegram/accounts/${activeAccountId}/search?q=${encodeURIComponent(query)}&limit=20`, { headers: authHeaders });
      if (res.ok) setSearchResults(await res.json());
    } catch (e) { console.warn('Unhandled error in TelegramInboxTab', e) }
  };

  const handleBookmark = async (msg: any) => {
    try {
      await fetch(`${API_BASE}/api/chat-telegram/bookmarks`, {
        method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
      toast("success", "북마???�?�됨");
      loadBookmarks();
    } catch (e) { console.warn('Unhandled error in TelegramInboxTab', e) }
  };

  const handleRemoveBookmark = async (msgId: number) => {
    try {
      await fetch(`${API_BASE}/api/chat-telegram/bookmarks/${msgId}`, {
        method: "DELETE", headers: authHeaders,
      });
      loadBookmarks();
    } catch (e) { console.warn('Unhandled error in TelegramInboxTab', e) }
  };

  const handleMuteDialog = async (chatId: number) => {
    try {
      await fetch(`${API_BASE}/api/chat-telegram/accounts/${activeAccountId}/dialogs/${chatId}/mute`, {
        method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ mute: true }),
      });
      toast("success", "?�소거되?�습?�다");
    } catch (e) { console.warn('Unhandled error in TelegramInboxTab', e) }
  };

  const handlePinDialog = async (chatId: number) => {
    try {
      await fetch(`${API_BASE}/api/chat-telegram/accounts/${activeAccountId}/dialogs/${chatId}/pin`, {
        method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ pin: true }),
      });
      toast("success", "고정?�었?�니??);
      loadDialogs();
    } catch (e) { console.warn('Unhandled error in TelegramInboxTab', e) }
  };

  const handleDeleteDialog = async (chatId: number) => {
    setDeleteConfirmChatId(chatId);
  };

  const totalUnread = dialogs.reduce((sum, d) => sum + d.unread_count, 0);

  const [dialogColors, setDialogColors] = useState<Record<number, string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("telegram_dialog_colors");
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  const handleChangeColor = (chatId: number, color: string) => {
    setDialogColors((prev) => {
      const next = { ...prev };
      if (color) next[chatId] = color;
      else delete next[chatId];
      localStorage.setItem("telegram_dialog_colors", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)]">
      {/* Dialog sidebar */}
      <div className={cn(
        "w-72 sm:w-80 border-r border-app-border flex flex-col shrink-0 bg-app-bg",
        activeChatId && "hidden sm:flex"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-app-border">
          <div>
            <h2 className="text-sm font-semibold text-app-text">Telegram</h2>
            <p className="text-[10px] text-app-text-muted">
              {dialogs.length}�??�?�방{totalUnread > 0 && ` · ${totalUnread}�????�음`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-app-card-hover transition-colors"
              title="북마??
            >
              <Star className={cn("h-3.5 w-3.5", showBookmarks ? "text-yellow-400 fill-yellow-400" : "text-app-text-muted")} />
            </button>
            <button onClick={loadDialogs} disabled={loading} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-app-card-hover transition-colors">
              <RefreshCw className={cn("h-3.5 w-3.5 text-app-text-muted", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Account selector */}
        {accounts.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-app-border overflow-x-auto">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => { setActiveAccountId(acc.id); setActiveChatId(null); }}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                  activeAccountId === acc.id ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                )}
              >
                {acc.name || acc.phone?.slice(-4) || "?"}
              </button>
            ))}
          </div>
        )}

        {/* Smart Folders */}
        {!activeChatId && (
          <div className="px-1.5 py-1 border-b border-app-border">
            <SmartFolders
              dialogs={dialogs}
              onSelectFolder={(name, ids) => {
                setFolderFilter(name);
                setFolderDialogIds(new Set(ids));
              }}
            />
          </div>
        )}

        {error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <InlineError action={<button onClick={loadDialogs} className="text-xs underline hover:no-underline">?�시 ?�도</button>}>{error}</InlineError>
          </div>
        ) : (
          <DialogList
            dialogs={displayDialogs}
            activeChatId={activeChatId}
            onSelectChat={setActiveChatId}
            loading={loading}
            unreadOnly={unreadOnly}
            onUnreadFilterChange={setUnreadOnly}
            onMessageSearch={handleMessageSearch}
            bookmarks={bookmarks}
            onSelectBookmark={(chatId) => setActiveChatId(chatId)}
            showBookmarks={showBookmarks}
            onMuteDialog={handleMuteDialog}
            onPinDialog={handlePinDialog}
            onDeleteDialog={handleDeleteDialog}
            dialogColors={dialogColors}
            onChangeDialogColor={handleChangeColor}
          />
        )}
      </div>

      {/* Chat panel */}
      <div className={cn(
        "flex-1 flex",
        !activeChatId && "hidden sm:flex"
      )}>
        {activeChatId && activeAccountId ? (
          <TelegramChatView
            key={`${activeAccountId}-${activeChatId}`}
            accountId={activeAccountId}
            chatId={activeChatId}
            chatTitle={activeChat?.title || "채팅"}
            onBack={() => setActiveChatId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-app-text-muted">
            <MessageCircle className="h-16 w-16 mb-3 opacity-20" />
            <h3 className="text-base font-semibold text-app-text mb-1">Telegram 메시지</h3>
            <p className="text-xs text-center max-w-xs">
              ?�쪽?�서 ?�?�방???�택?�거??검?�하??메시지�??�인?�세??
            </p>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteConfirmChatId !== null}
        onConfirm={async () => {
          const id = deleteConfirmChatId!;
          setDeleteConfirmChatId(null);
          try {
            await fetch(`${API_BASE}/api/chat-telegram/accounts/${activeAccountId}/dialogs/${id}`, { method: "DELETE", headers: authHeaders });
            toast("success", "??��?�었?�니??);
            if (activeChatId === id) setActiveChatId(null);
            loadDialogs();
          } catch (e) { console.warn('Unhandled error in TelegramInboxTab', e) }
        }}
        onCancel={() => setDeleteConfirmChatId(null)}
        title="?�?�방 ??��"
        description="?�말�????�?�방????��?�시겠습?�까? 모든 메시지가 ?�구?�으�???��?�니??"
        confirmLabel="??��"
        variant="danger"
      />
    </div>
  );
}
