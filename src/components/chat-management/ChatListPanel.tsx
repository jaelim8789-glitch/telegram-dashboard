"use client";

import { Search, Star, X, CheckCheck, VolumeX, Archive, MessageSquareCheck } from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatRoom, ChatType } from "./mockData";

interface ChatListPanelProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

interface RoomContextMenuState {
  x: number;
  y: number;
  roomId: string;
}

const TABS: { key: ChatType | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "personal", label: "개인" },
  { key: "group", label: "그룹" },
  { key: "channel", label: "채널" },
];

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
      {name[0]}
    </div>
  );
}

export function ChatListPanel({
  rooms,
  activeRoomId,
  onSelectRoom,
  onToggleFavorite,
}: ChatListPanelProps) {
  const [tab, setTab] = useState<ChatType | "all">("all");
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [roomMenu, setRoomMenu] = useState<RoomContextMenuState | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (tab !== "all" && r.type !== tab) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [rooms, tab, search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setIsSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setIsSearching(false), 200);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    setIsSearching(false);
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        handleClearSearch();
      }
    }
    function handleClick() {
      setRoomMenu(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
    };
  }, [handleClearSearch]);

  function handleRoomContextMenu(e: React.MouseEvent, roomId: string) {
    e.preventDefault();
    e.stopPropagation();
    setRoomMenu({ x: e.clientX, y: e.clientY, roomId });
  }

  function handleMarkRead(roomId: string) {
    setRoomMenu(null);
  }

  function handleMute(roomId: string) {
    setRoomMenu(null);
  }

  function handleArchive(roomId: string) {
    setRoomMenu(null);
  }

  return (
    <div
      className="flex h-full w-[280px] shrink-0 flex-col border-r border-violet-500/20 bg-app-surface max-sm:w-full max-sm:border-r-0"
      role="region"
      aria-label="채팅 목록"
    >
      <div className="border-b border-violet-500/20 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="대화 검색... (Ctrl+K)"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="대화 검색"
            className="w-full rounded-xl border border-app-border bg-app-card py-2 pl-8 pr-8 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              aria-label="검색 초기화"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-app-text-muted transition-colors hover:text-app-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isSearching && search && (
            <span className="absolute right-8 top-1/2 -translate-y-1/2">
              <span className="block h-3 w-3 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
            </span>
          )}
        </div>
      </div>

      <div className="flex border-b border-violet-500/20" role="tablist" aria-label="채팅 필터">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "text-white"
                : "text-app-text-muted hover:text-app-text-secondary"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <motion.span
                layoutId="tab-underline"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin" role="listbox" aria-label="채팅방 목록">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <p className="text-sm text-app-text-muted">검색 결과가 없습니다</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((room) => (
              <motion.div
                key={room.id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="group relative"
                onContextMenu={(e) => handleRoomContextMenu(e, room.id)}
              >
                <button
                  role="option"
                  aria-selected={activeRoomId === room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    activeRoomId === room.id
                      ? "border-l-2 border-violet-500 bg-violet-500/10"
                      : "border-l-2 border-transparent hover:bg-white/[0.02]"
                  }`}
                >
                  <Avatar name={room.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-app-text">
                        {room.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-app-text-subtle">
                        {formatRelativeTime(room.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs text-app-text-muted">
                        {room.lastMessage}
                      </span>
                      {room.unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white"
                        >
                          {room.unreadCount > 99 ? "99+" : room.unreadCount}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(room.id);
                  }}
                  className="absolute right-2 top-3 p-0.5"
                  aria-label={room.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
                >
                  <Star
                    className={`h-3.5 w-3.5 transition-all ${
                      room.isFavorite
                        ? "fill-yellow-400 text-yellow-400 opacity-100"
                        : "text-app-text-subtle opacity-0 group-hover:opacity-100 hover:!opacity-100"
                    }`}
                  />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {roomMenu && (
        <div
          className="fixed z-50 min-w-[150px] rounded-xl border border-violet-500/30 bg-app-card shadow-xl shadow-black/40 backdrop-blur-xl"
          style={{ left: roomMenu.x + 4, top: roomMenu.y + 4 }}
        >
          <button
            onClick={() => handleMarkRead(roomMenu.roomId)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text transition-colors hover:bg-violet-500/10 rounded-t-xl"
          >
            <MessageSquareCheck className="h-3.5 w-3.5 text-app-text-muted" />
            읽음으로 표시
          </button>
          <button
            onClick={() => handleMute(roomMenu.roomId)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text transition-colors hover:bg-violet-500/10"
          >
            <VolumeX className="h-3.5 w-3.5 text-app-text-muted" />
            음소거
          </button>
          <button
            onClick={() => handleArchive(roomMenu.roomId)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text-muted transition-colors hover:bg-violet-500/10 rounded-b-xl"
          >
            <Archive className="h-3.5 w-3.5" />
            보관
          </button>
        </div>
      )}
    </div>
  );
}
