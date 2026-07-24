"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, UserPlus, Send, Users, Search, CalendarClock, Bot, Zap, User, FileText, BarChart3, Globe, Folder, Command, Plus, ArrowRight, MessageSquare, Loader2, Hash, PanelTop,
} from "lucide-react";
import { TABS, type TabId, getAccountDisplayName, type Group, type Broadcast } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import * as api from "@/lib/api";
import type { MessageTemplate } from "@/lib/api";
import { cn } from "@/lib/cn";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "navigation" | "account" | "group" | "template" | "broadcast" | "action";
  action: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: "?비게이??,
  account: "계정",
  group: "그룹",
  template: "?플?,
  broadcast: "발송 기록",
  action: "빠른 ?션",
};

const CATEGORY_ORDER = ["navigation", "action", "account", "group", "template", "broadcast"];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function NavIcon({ tabId }: { tabId: string }) {
  const Icon = NAV_ICONS[tabId] ?? ArrowRight;
  return <Icon className="h-4 w-4" />;
}

function buildNavActions(setActiveTab: (tab: TabId) => void, close: () => void): SearchItem[] {
  const navigate = (tabId: TabId) => {
    setActiveTab(tabId);
    close();
  };

  return [
    ...TABS.map((tab) => ({
      id: `nav:${tab.id}`,
      label: tab.label,
      icon: <NavIcon tabId={tab.id} />,
      category: "navigation" as const,
      action: () => navigate(tab.id),
    })),
    { id: "action:new-broadcast", label: "??발송", icon: <Plus className="h-4 w-4" />, category: "action" as const, action: () => navigate("send") },
    { id: "action:find-groups", label: "그룹 검??, icon: <Search className="h-4 w-4" />, category: "action" as const, action: () => navigate("groupsearch") },
    { id: "action:add-account", label: "계정 ?록", icon: <UserPlus className="h-4 w-4" />, category: "action" as const, action: () => navigate("register") },
    { id: "action:view-failed", label: "?패??발송 보기", icon: <FileText className="h-4 w-4" />, category: "action" as const, action: () => navigate("log") },
    { id: "action:open-scheduler", label: "??줄러 ?기", icon: <CalendarClock className="h-4 w-4" />, category: "action" as const, action: () => navigate("scheduler") },
    { id: "action:delivery-analytics", label: "?달 분석", icon: <BarChart3 className="h-4 w-4" />, category: "action" as const, action: () => navigate("deliveryanalytics") },
  ];
}

function buildAccountItems(accounts: ReturnType<typeof useDashboardStore.getState>["accounts"], selectAccount: (id: string) => void, setActiveTab: (tab: TabId) => void, close: () => void): SearchItem[] {
  return accounts.map((a) => ({
    id: `account-${a.id}`,
    label: getAccountDisplayName(a),
    description: a.status === "active" ? "?성" : a.status,
    icon: <User className="h-4 w-4" />,
    category: "account" as const,
    action: () => { selectAccount(a.id); setActiveTab("send"); close(); },
  }));
}

function buildGroupItems(groups: Group[], selectAccount: (id: string) => void, setActiveTab: (tab: TabId) => void, close: () => void): SearchItem[] {
  return groups.map((g) => ({
    id: `group-${g.id}`,
    label: g.title,
    description: `${g.type === "channel" ? "채널" : "그룹"} · ${g.participantsCount ?? "?"}?,
    icon: <Hash className="h-4 w-4" />,
    category: "group" as const,
    action: () => { setActiveTab("send"); close(); },
  }));
}

function buildTemplateItems(templates: MessageTemplate[]): SearchItem[] {
  return templates.map((t) => ({
    id: `template-${t.id}`,
    label: t.name,
    description: t.content.length > 60 ? t.content.slice(0, 60) + "..." : t.content,
    icon: <MessageSquare className="h-4 w-4" />,
    category: "template" as const,
    action: () => {
      const store = useDashboardStore.getState();
      store.setSendMessage(t.content);
      store.setActiveTab("send");
      useCommandPaletteStore.getState().setOpen(false);
    },
  }));
}

function buildBroadcastItems(broadcasts: Broadcast[]): SearchItem[] {
  return broadcasts.map((b) => ({
    id: `broadcast-${b.id}`,
    label: b.message.length > 50 ? b.message.slice(0, 50) + "..." : b.message,
    description: b.status === "sent" ? "?료" : b.status === "failed" ? "?패" : b.status === "sending" ? "발송 ? : b.status === "pending" ? "??? : "취소??,
    icon: <Send className="h-4 w-4" />,
    category: "broadcast" as const,
    action: () => {
      const store = useDashboardStore.getState();
      store.reuseBroadcast(b);
      useCommandPaletteStore.getState().setOpen(false);
    },
  }));
}

const LOCAL_CATEGORIES = new Set(["navigation", "action", "account", "group"]);

function matchesQuery(item: SearchItem, q: string): boolean {
  if (item.label.toLowerCase().includes(q)) return true;
  if (item.description?.toLowerCase().includes(q)) return true;
  return false;
}

export function CommandPalette() {
  const [mounted, setMounted] = useState(false);
  const open = useCommandPaletteStore((state) => state.open);
  const setOpen = useCommandPaletteStore((state) => state.setOpen);
  const toggle = useCommandPaletteStore((state) => state.toggle);
  const recent = useCommandPaletteStore((state) => state.recent);
  const addRecent = useCommandPaletteStore((state) => state.addRecent);
  const setActiveTab = useDashboardStore((state) => state.setActiveTab);
  const accounts = useDashboardStore((state) => state.accounts);
  const groups = useDashboardStore((state) => state.sendGroups);
  const selectAccount = useDashboardStore((state) => state.selectAccount);

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setMounted(true); }, []);

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
      setTemplates([]);
      setBroadcasts([]);
      setSearching(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced remote search for templates + broadcasts
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setTemplates([]);
      setBroadcasts([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [templateRes, logsRes] = await Promise.allSettled([
          api.fetchTemplates("default", { search: q, limit: 5 }),
          api.fetchLogs({ days: 30 }),
        ]);
        if (templateRes.status === "fulfilled") {
          setTemplates(templateRes.value.items);
        }
        if (logsRes.status === "fulfilled") {
          const qLower = q.toLowerCase();
          const filtered = logsRes.value.filter((log) =>
            log.message.toLowerCase().includes(qLower) ||
            log.status.toLowerCase().includes(qLower) ||
            (log.errorMessage ?? "").toLowerCase().includes(qLower)
          );
          setBroadcasts(filtered.slice(0, 5));
        }
      } catch (e) { console.warn('Unhandled error in CommandPalette', e) }
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const localItems = useMemo(() => {
    const items: SearchItem[] = [];
    items.push(...buildNavActions(setActiveTab, () => setOpen(false)));
    items.push(...buildAccountItems(accounts, selectAccount, setActiveTab, () => setOpen(false)));
    if (groups) {
      items.push(...buildGroupItems(groups, selectAccount, setActiveTab, () => setOpen(false)));
    }
    return items;
  }, [accounts, groups, selectAccount, setActiveTab, setOpen]);

  const remoteItems = useMemo(() => {
    const items: SearchItem[] = [];
    items.push(...buildTemplateItems(templates));
    items.push(...buildBroadcastItems(broadcasts));
    return items;
  }, [templates, broadcasts]);

  // Combine and filter
  const allFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { local: localItems, remote: [] as SearchItem[], grouped: false };
    const local = localItems.filter((item) => matchesQuery(item, q));
    const remote = remoteItems.filter((item) => matchesQuery(item, q));
    return { local, remote, grouped: q.length > 0 };
  }, [localItems, remoteItems, query]);

  const displayCommands = useMemo(() => {
    const { local, remote } = allFiltered;
    if (!query.trim()) {
      // Show recent first, then all local
      if (recent.length > 0) {
        const recentItems = recent
          .map((id) => [...local, ...remote].find((c) => c.id === id))
          .filter((item): item is SearchItem => item != null);
        if (recentItems.length > 0) return { items: recentItems, label: "최근 ?용" };
      }
      return { items: local, label: null };
    }
    const combined = [...local, ...remote];
    return { items: combined, label: null };
  }, [allFiltered, query, recent]);

  // Grouped display for search results
  const groupedResults = useMemo(() => {
    if (!query.trim()) return null;
    const { local, remote } = allFiltered;
    const grouped = new Map<string, SearchItem[]>();
    for (const item of [...local, ...remote]) {
      const existing = grouped.get(item.category) ?? [];
      existing.push(item);
      grouped.set(item.category, existing);
    }
    return grouped;
  }, [allFiltered, query]);

  const flatItems = displayCommands.items;
  const safeIdx = Math.min(activeIdx, Math.max(0, flatItems.length - 1));

  useEffect(() => {
    if (activeIdx !== safeIdx) setActiveIdx(safeIdx);
  }, [activeIdx, safeIdx]);

  const execute = useCallback(
    (item: SearchItem) => {
      addRecent(item.id);
      item.action();
    },
    [addRecent],
  );

  function handleKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((current) => Math.min(current + 1, flatItems.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (flatItems[safeIdx]) execute(flatItems[safeIdx]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${safeIdx}"]`) as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [safeIdx]);

  if (!mounted) return null;

  const showGrouped = groupedResults && query.trim().length > 0;

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
            aria-label="?퍼 검??
            className="relative flex w-[90vw] max-w-[560px] flex-col rounded-2xl border border-app-border bg-app-card shadow-2xl shadow-black/20"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-app-text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIdx(0);
                }}
                placeholder="계정 · 그룹 · ?플?· 발송 기록 · 메뉴 ?합 검??.."
                className="min-w-0 flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-subtle"
                aria-label="?합 검??
              />
              {searching && <Loader2 className="h-4 w-4 animate-spin text-app-text-muted" />}
              <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-app-border bg-app-card-hover px-1.5 py-0.5 text-[10px] font-medium text-app-text-subtle sm:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[55vh] overflow-y-auto px-2 py-2"
              role="listbox"
              aria-label="검??결과"
            >
              {/* Recent label */}
              {displayCommands.label && flatItems.length > 0 && (
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-app-text-subtle">
                  {displayCommands.label}
                </div>
              )}

              {/* Empty state */}
              {flatItems.length === 0 && !searching && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
                  <p className="text-xs text-app-text-muted">?치?는 ?????습?다</p>
                  <p className="mt-0.5 text-[10px] text-app-text-subtle">?른 ?워?로 검?해보세??/p>
                </div>
              )}

              {/* Searching state */}
              {flatItems.length === 0 && searching && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-app-text-muted" />
                  <p className="text-xs text-app-text-muted">검???..</p>
                </div>
              )}

              {/* Grouped results */}
              {showGrouped ? (
                Array.from(groupedResults.entries())
                  .filter(([, items]) => items.length > 0)
                  .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
                  .map(([category, items]) => (
                    <div key={category} className="mb-2">
                      <div className="mb-0.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-app-text-subtle">
                        {CATEGORY_LABELS[category] ?? category}
                      </div>
                          {items.map((item) => {
                        const idx = flatItems.indexOf(item);
                        const selected = idx === safeIdx;
                        const shortcutHint = item.id.startsWith("nav:")
                          ? `Alt+${TABS.findIndex((t) => `nav:${t.id}` === item.id) + 1 || ""}`
                          : null;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            data-idx={idx}
                            onClick={() => execute(item)}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              selected ? "bg-app-primary/10 text-app-primary" : "text-app-text hover:bg-app-card-hover",
                            )}
                          >
                            <span className={cn("flex shrink-0 items-center", selected ? "text-app-primary" : "text-app-text-muted")}>
                              {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{item.label}</span>
                              {item.description && (
                                <span className="block truncate text-[11px] text-app-text-muted">{item.description}</span>
                              )}
                            </div>
                            {shortcutHint && (
                              <kbd className="shrink-0 rounded-md border border-app-border bg-app-card-hover px-1.5 py-0.5 text-[9px] font-mono text-app-text-subtle">
                                {shortcutHint}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
              ) : (
                /* Flat list (recent or no query) */
                flatItems.map((item, index) => {
                  const selected = index === safeIdx;
                  const shortcutHint = item.id.startsWith("nav:")
                    ? `Alt+${TABS.findIndex((t) => `nav:${t.id}` === item.id) + 1 || ""}`
                    : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-idx={index}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setActiveIdx(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        selected ? "bg-app-primary/10 text-app-primary" : "text-app-text hover:bg-app-card-hover",
                      )}
                    >
                      <span className={cn("flex shrink-0 items-center", selected ? "text-app-primary" : "text-app-text-muted")}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate font-medium">{item.label}</span>
                      {shortcutHint && (
                        <kbd className="shrink-0 rounded-md border border-app-border bg-app-card-hover px-1.5 py-0.5 text-[9px] font-mono text-app-text-subtle">
                          {shortcutHint}
                        </kbd>
                      )}
                      {item.description && !selected && (
                        <span className="shrink-0 text-[10px] text-app-text-subtle">{item.description}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="hidden items-center gap-3 border-t border-app-border px-4 py-2 sm:flex">
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-subtle">
                <kbd className="rounded border border-app-border bg-app-card-hover px-1 py-0.5 font-sans">?↓</kbd>
                <span>?동</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-subtle">
                <kbd className="rounded border border-app-border bg-app-card-hover px-1 py-0.5 font-sans">??/kbd>
                <span>?택</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-app-text-subtle">
                <kbd className="rounded border border-app-border bg-app-card-hover px-1 py-0.5 font-sans">Esc</kbd>
                <span>?기</span>
              </div>
              {searching && (
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-app-text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>검???..</span>
                </div>
              )}
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
      aria-label="?퍼 검???기"
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text sm:min-h-8 sm:min-w-8"
      title="?퍼 검??(?K)"
    >
      <Command className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
