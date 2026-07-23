"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search, MessageCircle, Users, Hash, User,
  ChevronDown, Pin, CheckCheck, BellOff, Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import Image from "next/image";

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

interface Bookmark {
  id: number;
  chat_title: string;
  text: string;
  sender_name: string;
  date: string;
}

interface DialogListProps {
  dialogs: Dialog[];
  activeChatId: number | null;
  onSelectChat: (chatId: number) => void;
  loading?: boolean;
  search?: string;
  onSearchChange?: (q: string) => void;
  unreadOnly?: boolean;
  onUnreadFilterChange?: (v: boolean) => void;
  onMessageSearch?: (query: string) => void;
  bookmarks?: Bookmark[];
  onSelectBookmark?: (chatId: number) => void;
  showBookmarks?: boolean;
  onMuteDialog?: (chatId: number) => void;
  onPinDialog?: (chatId: number) => void;
  onDeleteDialog?: (chatId: number) => void;
  dialogColors?: Record<number, string>;
  onChangeDialogColor?: (chatId: number, color: string) => void;
  dialogPhotos?: Record<number, string>;
}

const TYPE_ICONS: Record<string, typeof MessageCircle> = {
  private: User,
  group: Users,
  megagroup: Hash,
  channel: Hash,
};

const DIALOG_COLORS = [
  { name: "기본", color: "" },
  { name: "레드", color: "bg-red-500" },
  { name: "오렌지", color: "bg-orange-500" },
  { name: "그린", color: "bg-green-500" },
  { name: "블루", color: "bg-blue-500" },
  { name: "퍼플", color: "bg-purple-500" },
  { name: "핑크", color: "bg-pink-500" },
  { name: "민트", color: "bg-teal-500" },
];

export function DialogList({
  dialogs,
  activeChatId,
  onSelectChat,
  loading,
  search,
  onSearchChange,
  unreadOnly = false,
  onUnreadFilterChange,
  onMessageSearch,
  bookmarks,
  onSelectBookmark,
  showBookmarks,
  onMuteDialog,
  onPinDialog,
  onDeleteDialog,
  dialogColors,
  onChangeDialogColor,
  dialogPhotos,
}: DialogListProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchValue = search ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  useEffect(() => {
    if (!searchValue || !onMessageSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const match = dialogs.some((d) =>
        d.title.toLowerCase().includes(searchValue.toLowerCase())
      );
      if (!match) onMessageSearch(searchValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, dialogs, onMessageSearch]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);

  const filtered = useMemo(() => {
    let result = dialogs;
    if (unreadOnly) {
      result = result.filter((d) => d.unread_count > 0);
    }
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(q));
    }
    return result;
  }, [dialogs, searchValue, unreadOnly]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.last_message_date && b.last_message_date)
        return new Date(b.last_message_date).getTime() - new Date(a.last_message_date).getTime();
      return 0;
    });
  }, [filtered]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()] + "요일";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (loading) {
    return (
      <div className="space-y-1 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
          <div key={`dl-sk-${i}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="h-10 w-10 rounded-full bg-app-border animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-app-border animate-pulse rounded" />
              <div className="h-2.5 w-40 bg-app-border/50 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-3 pb-2 pt-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-app-text-muted" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="대화방 검색..."
            className="w-full rounded-xl border border-app-border bg-app-bg pl-9 pr-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
          />
        </div>
      </div>

      {/* Unread filter chips */}
      {onUnreadFilterChange && (
        <div className="flex gap-1.5 px-3 pb-2">
          <button onClick={() => onUnreadFilterChange(false)}
            className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
              !unreadOnly ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted"
            )}>전체</button>
          <button onClick={() => onUnreadFilterChange(true)}
            className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
              unreadOnly ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted"
            )}>📩 안 읽음</button>
        </div>
      )}

      {/* Bookmarks sidebar */}
      {showBookmarks && bookmarks && bookmarks.length > 0 && (
        <div className="px-3 pb-2">
          <div className="mb-1.5 text-[11px] font-semibold text-app-text-muted">⭐ 북마크</div>
          <div className="space-y-1">
            {bookmarks.map((bm) => (
              <button
                key={bm.id}
                onClick={() => onSelectBookmark?.(bm.id)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-app-card-hover transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-app-text">{bm.chat_title}</div>
                  <div className="truncate text-app-text-muted">{bm.sender_name}: {bm.text}</div>
                </div>
                <span className="shrink-0 text-[10px] text-app-text-muted">{bm.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dialog list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 px-1.5 pb-2">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center py-8 text-app-text-muted">
            <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">대화방이 없습니다</p>
          </div>
        )}
        {sorted.map((dialog) => {
          const Icon = TYPE_ICONS[dialog.type] ?? MessageCircle;
          const isActive = dialog.id === activeChatId;
          const customColor = dialogColors?.[dialog.id];
          const photoUrl = dialogPhotos?.[dialog.id];
          return (
            <SwipeableRow
              key={dialog.id}
              actions={[
                ...(onMuteDialog ? [{
                  label: "음소거",
                  icon: <BellOff className="h-3.5 w-3.5" />,
                  color: "bg-blue-500",
                  onAction: () => onMuteDialog(dialog.id),
                }] : []),
                ...(onPinDialog ? [{
                  label: "고정",
                  icon: <Pin className="h-3.5 w-3.5" />,
                  color: "bg-green-500",
                  onAction: () => onPinDialog(dialog.id),
                }] : []),
                ...(onDeleteDialog ? [{
                  label: "삭제",
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  color: "bg-red-500",
                  onAction: () => onDeleteDialog(dialog.id),
                }] : []),
              ]}
            >
              <button
                onClick={() => onSelectChat(dialog.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, chatId: dialog.id });
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  isActive ? "bg-app-primary/10 text-app-primary" : "hover:bg-app-card-hover text-app-text"
                )}
              >
              {/* Avatar */}
              {photoUrl ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                  {/* <img src={photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> */}
                  <Image 
                    src={photoUrl} 
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                    priority={false}
                    unoptimized // 외부 이미지이므로 최적화 비활성화
                  />
                </div>
              ) : (
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                customColor || (dialog.type === "private"
                  ? "bg-green-500/10 text-green-500"
                  : dialog.type === "channel"
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-purple-500/10 text-purple-500")
              )}>
                <Icon className="h-4 w-4" />
              </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-medium">{dialog.title}</span>
                  <span className="shrink-0 text-[10px] text-app-text-muted">
                    {formatTime(dialog.last_message_date)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="truncate text-[11px] text-app-text-muted">
                    {dialog.last_message || (dialog.participants_count > 0 ? `멤버 ${dialog.participants_count}명` : "")}
                  </span>
                  {dialog.unread_count > 0 && (
                    <span className="shrink-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-app-primary px-1.5 text-[9px] font-bold text-white">
                      {dialog.unread_count > 99 ? "99+" : dialog.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
            </SwipeableRow>
          );
        })}
        {contextMenu && (
          <div
            style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
            className="bg-app-card border border-app-border rounded-xl p-2 shadow-xl"
          >
            <div className="grid grid-cols-4 gap-1.5">
              {DIALOG_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    onChangeDialogColor?.(contextMenu.chatId, c.color);
                    setContextMenu(null);
                  }}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-transform hover:scale-110",
                    c.color || "border border-app-border text-app-text-muted"
                  )}
                  title={c.name}
                >
                  {c.color ? "" : "×"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
