"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  UserPlus,
  Send,
  Users,
  Search,
  CalendarClock,
  Bot,
  Zap,
  User,
  FileText,
  BarChart3,
  Globe,
  Folder,
  Command,
  Plus,
  ArrowRight,
} from "lucide-react";
import { TABS, type TabId } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { cn } from "@/lib/cn";

interface PaletteCommand {
  id: string;
  label: string;
  keywords: string[];
  icon: ComponentType<{ className?: string }>;
  tabId?: TabId;
  action?: () => void;
}

const NAV_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  register: UserPlus,
  send: Send,
  scheduler: CalendarClock,
  group: Users,
  groupsearch: Search,
  autoreply: Bot,
  replymacro: Zap,
  folders: Folder,
  deliveryanalytics: BarChart3,
  channelhub: Globe,
  profile: User,
  log: FileText,
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function buildCommands(
  setActiveTab: (tab: TabId) => void,
  addRecent: (id: string) => void,
  close: () => void,
): PaletteCommand[] {
  const navigate = (tabId: TabId) => {
    addRecent(tabId);
    setActiveTab(tabId);
    close();
  };

  return [
    ...TABS.map((tab) => ({
      id: `nav:${tab.id}`,
      label: tab.label,
      keywords: [tab.label, tab.id, tab.group === "operate" ? "운영" : "관리"],
      icon: NAV_ICONS[tab.id] ?? ArrowRight,
      tabId: tab.id,
    })),
    {
      id: "action:new-broadcast",
      label: "새 발송",
      keywords: ["새 발송", "new", "broadcast", "send", "작성"],
      icon: Plus,
      action: () => navigate("send"),
    },
    {
      id: "action:find-groups",
      label: "그룹 검색",
      keywords: ["그룹 검색", "find", "search", "group", "discovery"],
      icon: Search,
      action: () => navigate("groupsearch"),
    },
    {
      id: "action:add-account",
      label: "계정 등록",
      keywords: ["계정 등록", "add", "account", "register", "new account"],
      icon: UserPlus,
      action: () => navigate("register"),
    },
    {
      id: "action:view-failed",
      label: "실패한 발송 보기",
      keywords: ["실패", "failed", "fail", "error", "broadcast", "발송 실패"],
      icon: FileText,
      action: () => navigate("log"),
    },
    {
      id: "action:open-scheduler",
      label: "스케줄러 열기",
      keywords: ["스케줄러", "scheduler", "schedule", "recurring", "반복"],
      icon: CalendarClock,
      action: () => navigate("scheduler"),
    },
    {
      id: "action:delivery-analytics",
      label: "전달 분석",
      keywords: ["전달 분석", "analytics", "delivery", "통계", "분석"],
      icon: BarChart3,
      action: () => navigate("deliveryanalytics"),
    },
  ];
}

export function CommandPalette() {
  const [mounted, setMounted] = useState(false);
  const open = useCommandPaletteStore((state) => state.open);
  const setOpen = useCommandPaletteStore((state) => state.setOpen);
  const toggle = useCommandPaletteStore((state) => state.toggle);
  const recent = useCommandPaletteStore((state) => state.recent);
  const addRecent = useCommandPaletteStore((state) => state.addRecent);
  const setActiveTab = useDashboardStore((state) => state.setActiveTab);

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        toggle();
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen, toggle]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo(
    () => buildCommands(setActiveTab, addRecent, () => setOpen(false)),
    [addRecent, setActiveTab, setOpen],
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return commands;
    const q = trimmed.toLowerCase();
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) ||
        command.keywords.some((keyword) => keyword.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  const recentCommands = useMemo(() => {
    if (query.trim()) return null;
    if (recent.length === 0) return null;
    return recent
      .map((id) => commands.find((command) => command.id === id))
      .filter((command): command is PaletteCommand => command != null);
  }, [commands, query, recent]);

  const displayCommands = recentCommands ?? filtered;
  const displayLabel = recentCommands && query.trim() === "" ? "최근 사용" : null;
  const safeIdx = Math.min(activeIdx, Math.max(0, displayCommands.length - 1));

  useEffect(() => {
    if (activeIdx !== safeIdx) {
      setActiveIdx(safeIdx);
    }
  }, [activeIdx, safeIdx]);

  const execute = useCallback(
    (command: PaletteCommand) => {
      addRecent(command.id);
      if (command.tabId) {
        setActiveTab(command.tabId);
      }
      command.action?.();
      setOpen(false);
    },
    [addRecent, setActiveTab, setOpen],
  );

  function handleKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((current) => Math.min(current + 1, displayCommands.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (displayCommands[safeIdx]) execute(displayCommands[safeIdx]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[safeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [safeIdx]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="명령 팔레트"
            className="relative flex w-[90vw] max-w-[520px] flex-col rounded-2xl border border-app-border bg-app-card shadow-2xl shadow-black/20"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-app-text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIdx(0);
                }}
                placeholder="명령을 검색하세요…"
                className="min-w-0 flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-subtle"
                aria-label="명령 검색"
              />
              <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-app-border bg-app-card-hover px-1.5 py-0.5 text-[10px] font-medium text-app-text-subtle sm:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>

            <div
              ref={listRef}
              className="max-h-[50vh] overflow-y-auto px-2 py-2"
              role="listbox"
              aria-label={displayLabel ?? "명령 목록"}
            >
              {displayLabel && displayCommands.length > 0 && (
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-app-text-subtle">
                  {displayLabel}
                </div>
              )}

              {displayCommands.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
                  <p className="text-xs text-app-text-muted">일치하는 명령이 없습니다</p>
                  <p className="mt-0.5 text-[10px] text-app-text-subtle">다른 키워드로 검색해보세요</p>
                </div>
              )}

              {displayCommands.map((command, index) => {
                const selected = index === safeIdx;
                const Icon = command.icon;
                return (
                  <button
                    key={command.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => execute(command)}
                    onMouseEnter={() => setActiveIdx(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      selected ? "bg-app-primary/10 text-app-primary" : "text-app-text hover:bg-app-card-hover",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-app-primary" : "text-app-text-muted")} aria-hidden="true" />
                    <span className="flex-1 truncate">{command.label}</span>
                    {command.tabId && !selected && (
                      <span className="shrink-0 text-[10px] text-app-text-subtle">
                        {TABS.find((tab) => tab.id === command.tabId)?.group === "operate" ? "운영" : "관리"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center gap-3 border-t border-app-border px-4 py-2 sm:flex">
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-subtle">
                <kbd className="rounded border border-app-border bg-app-card-hover px-1 py-0.5 font-sans">↑↓</kbd>
                <span>이동</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-subtle">
                <kbd className="rounded border border-app-border bg-app-card-hover px-1 py-0.5 font-sans">↵</kbd>
                <span>선택</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-subtle">
                <kbd className="rounded border border-app-border bg-app-card-hover px-1 py-0.5 font-sans">Esc</kbd>
                <span>닫기</span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-app-text-subtle">
                <kbd className="rounded border border-app-border bg-app-card-hover px-1 py-0.5 font-sans">
                  <Command className="mr-0.5 inline h-2 w-2" />K
                </kbd>
                <span>열기</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function CommandPaletteTrigger() {
  const toggle = useCommandPaletteStore((state) => state.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="명령 팔레트 열기"
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text sm:min-h-8 sm:min-w-8"
      title="명령 팔레트 (⌘K)"
    >
      <Command className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
