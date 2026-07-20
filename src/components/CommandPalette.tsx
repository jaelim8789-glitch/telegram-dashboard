"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search as SearchIcon, SearchX, LayoutDashboard, UserPlus, Send, Users,
  Link, User, FileText, MessageCircle, Reply, BarChart3, Calendar,
  Radio, FolderOpen, FileSymlink, Bot, Heart, Users2, Zap,
  Activity, Layers, MessageSquare, Star, X,
} from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { TabId } from "@/types";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category: "navigation" | "action";
}

const TAB_ACTIONS: { tab: TabId; label: string; icon: React.ReactNode; keywords?: string[] }[] = [
  { tab: "dashboard", label: "대시보드", icon: <LayoutDashboard className="h-4 w-4" />, keywords: ["home", "main"] },
  { tab: "register", label: "계정 등록", icon: <UserPlus className="h-4 w-4" />, keywords: ["account", "add"] },
  { tab: "send", label: "메시지 발송", icon: <Send className="h-4 w-4" />, keywords: ["broadcast", "message"] },
  { tab: "group", label: "그룹 관리", icon: <Users className="h-4 w-4" />, keywords: ["channel"] },
  { tab: "groupsearch", label: "그룹 검색", icon: <SearchIcon className="h-4 w-4" /> },
  { tab: "linkinspector", label: "링크 검사", icon: <Link className="h-4 w-4" /> },
  { tab: "profile", label: "프로필", icon: <User className="h-4 w-4" /> },
  { tab: "log", label: "발송 로그", icon: <FileText className="h-4 w-4" /> },
  { tab: "autoreply", label: "자동 응답", icon: <MessageCircle className="h-4 w-4" /> },
  { tab: "replymacro", label: "답장 매크로", icon: <Reply className="h-4 w-4" /> },
  { tab: "deliveryanalytics", label: "전달 분석", icon: <BarChart3 className="h-4 w-4" />, keywords: ["analytics"] },
  { tab: "scheduler", label: "스케줄러", icon: <Calendar className="h-4 w-4" /> },
  { tab: "channelhub", label: "채널 허브", icon: <Radio className="h-4 w-4" /> },
  { tab: "folders", label: "폴더", icon: <FolderOpen className="h-4 w-4" /> },
  { tab: "templates", label: "템플릿", icon: <FileSymlink className="h-4 w-4" /> },
  { tab: "myai", label: "AI 설정", icon: <Bot className="h-4 w-4" /> },
  { tab: "health", label: "계정 건강", icon: <Heart className="h-4 w-4" />, keywords: ["monitor"] },
  { tab: "guestbot", label: "GuestBot", icon: <Users2 className="h-4 w-4" /> },
  { tab: "drafts", label: "임시 저장", icon: <Layers className="h-4 w-4" /> },
  { tab: "triggers", label: "트리거", icon: <Zap className="h-4 w-4" /> },
  { tab: "campaigns", label: "캠페인", icon: <Activity className="h-4 w-4" /> },
  { tab: "stars", label: "Stars 결제", icon: <Star className="h-4 w-4" /> },
];

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen, recent, addRecent, clearRecent } = useCommandPaletteStore();
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const accounts = useDashboardStore((s) => s.accounts);
  const selectAccount = useDashboardStore((s) => s.selectAccount);

  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open, () => setOpen(false));

  // Global keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, setOpen]);

  // Reset query/selection when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Navigation: tabs
    for (const t of TAB_ACTIONS) {
      items.push({
        id: `tab-${t.tab}`,
        label: t.label,
        icon: t.icon,
        category: "navigation",
        keywords: t.keywords,
        action: () => {
          addRecent(`tab-${t.tab}`);
          setActiveTab(t.tab);
          setOpen(false);
        },
      });
    }

    // Navigation: accounts
    for (const a of accounts) {
      items.push({
        id: `account-${a.id}`,
        label: a.name ?? a.phone,
        description: a.status === "active" ? "활성" : a.status,
        icon: <User className="h-4 w-4" />,
        category: "navigation",
        keywords: [a.phone, a.name ?? ""],
        action: () => {
          addRecent(`account-${a.id}`);
          selectAccount(a.id);
          setActiveTab("send");
          setOpen(false);
        },
      });
    }

    return items;
  }, [accounts, addRecent, selectAccount, setActiveTab, setOpen]);

  const filtered = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        if (cmd.label.toLowerCase().includes(q)) return true;
        if (cmd.description?.toLowerCase().includes(q)) return true;
        return cmd.keywords?.some((k) => k.toLowerCase().includes(q));
      })
    : commands;

  const recentCommands = query.trim()
    ? []
    : recent
        .map((id) => commands.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const list = recentCommands.length > 0 && !query.trim()
        ? recentCommands
        : filtered;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, list.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && list[selectedIdx]) {
        e.preventDefault();
        list[selectedIdx].action();
      }
    },
    [filtered, recentCommands, query, selectedIdx],
  );

  if (!open) return null;

  const displayList = recentCommands.length > 0 && !query.trim() ? recentCommands : filtered;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" role="dialog" aria-modal="true" aria-label="명령 팔레트">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg rounded-2xl border border-app-border bg-app-card shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-app-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="명령어나 탭을 검색하세요..."
            className="flex-1 bg-transparent text-sm text-app-text placeholder:text-app-text-subtle outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-app-border bg-app-bg px-1.5 py-0.5 text-[10px] text-app-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin py-1">
          {recentCommands.length > 0 && !query.trim() && (
            <div className="px-2 py-1 text-[10px] font-medium text-app-text-muted uppercase tracking-wider">
              최근 사용
            </div>
          )}
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <SearchX className="mb-2 h-6 w-6 text-app-text-subtle" />
              <p className="text-xs text-app-text-muted">일치하는 명령어가 없습니다</p>
            </div>
          ) : (
            displayList.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { setSelectedIdx(i); cmd.action(); }}
                onMouseEnter={() => setSelectedIdx(i)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  i === selectedIdx ? "bg-app-primary/10 text-app-primary" : "text-app-text hover:bg-app-card-hover",
                )}
              >
                <span className={cn(
                  "shrink-0", i === selectedIdx ? "text-app-primary" : "text-app-text-muted"
                )}>
                  {cmd.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{cmd.label}</span>
                  {cmd.description && (
                    <span className="block truncate text-[11px] text-app-text-muted">{cmd.description}</span>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-app-text-subtle capitalize">
                  {cmd.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-app-border px-4 py-2 text-[10px] text-app-text-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-app-border bg-app-bg px-1">↑↓</kbd> 이동</span>
            <span><kbd className="rounded border border-app-border bg-app-bg px-1">↵</kbd> 선택</span>
            <span><kbd className="rounded border border-app-border bg-app-bg px-1">ESC</kbd> 닫기</span>
          </div>
          {recentCommands.length > 0 && (
            <button onClick={clearRecent} className="hover:text-app-text transition-colors">
              최근 기록 지우기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
