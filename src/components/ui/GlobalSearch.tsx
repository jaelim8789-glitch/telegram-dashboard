"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Users, Send, MessageSquare, X, Loader2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";

/**
 * Global Search (Cmd+K) — fuzzy search accounts, groups, broadcasts
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ label: string; sub: string; action: () => void; icon: React.ReactNode }[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const accounts = useDashboardStore((s) => s.accounts);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((p) => !p); }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); return; }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const items: typeof results = [];

    // Fuzzy match accounts
    accounts.filter((a) => {
      const name = (a.name || a.phone || "").toLowerCase();
      let ti = 0; for (let ci = 0; ci < q.length && ti < name.length; ci++) { if (q[ci] === name[ti]) ti++; }
      return ti === q.length;
    }).slice(0, 5).forEach((a) => {
      items.push({ label: a.name || a.phone || "계정", sub: `계정 · ${(a.phone || "").slice(0, 12)}`, action: () => { useDashboardStore.getState().selectAccount(a.id); setOpen(false); }, icon: <Users className="h-3.5 w-3.5" /> });
    });

    // Tab search
    const tabMap: Record<string, { label: string; icon: React.ReactNode }> = {
      send: { label: "발송하기", icon: <Send className="h-3.5 w-3.5" /> },
      myai: { label: "AI 대화", icon: <MessageSquare className="h-3.5 w-3.5" /> },
      group: { label: "그룹", icon: <Users className="h-3.5 w-3.5" /> },
    };
    Object.entries(tabMap).forEach(([id, t]) => {
      if (fuzzyMatch(q, t.label)) items.push({ label: t.label, sub: "탭 이동", action: () => { setActiveTab(id); setOpen(false); }, icon: t.icon });
    });

    setResults(items);
    setSelectedIdx(0);
  }, [query, open]);

  function fuzzyMatch(term: string, target: string): boolean {
    const t = target.toLowerCase();
    if (t.includes(term)) return true;
    let ti = 0; for (let ci = 0; ci < term.length && ti < t.length; ci++) { if (term[ci] === t[ti]) ti++; }
    return ti === term.length;
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) { results[selectedIdx].action(); }
    if (e.key === "Escape") setOpen(false);
  }

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-app-border bg-app-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
              <Search className="h-4 w-4 text-app-text-muted shrink-0" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKey}
                placeholder="계정, 그룹, 탭 검색..." className="flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-muted/50" />
              <kbd className="rounded border border-app-border px-1.5 py-0.5 text-[10px] text-app-text-muted">ESC</kbd>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {results.length === 0 && query.trim() && (
                <div className="flex items-center justify-center py-8 text-xs text-app-text-muted">검색 결과가 없습니다</div>
              )}
              {results.length === 0 && !query.trim() && (
                <div className="flex items-center justify-center py-8 text-xs text-app-text-muted">
                  계정 이름, 그룹 이름, 탭 이름을 검색하세요
                </div>
              )}
              {results.map((r, i) => (
                <button key={r.label} onClick={r.action} onMouseEnter={() => setSelectedIdx(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selectedIdx ? "bg-app-primary/10" : "hover:bg-app-card-hover"}`}>
                  <span className="text-app-text-muted">{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-app-text truncate">{r.label}</p>
                    <p className="text-[10px] text-app-text-muted">{r.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
