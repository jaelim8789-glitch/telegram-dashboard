"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useThemeStore } from "@/store/useThemeStore";

export function CommandPalette() {
  const { open, query, results, setOpen, setQuery } = useCommandPaletteStore();
  const setActiveTab = useDashboardStore(s => s.setActiveTab);
  const cycleTheme = useThemeStore(s => s.cycle);

  function execute(action: string) {
    if (action.startsWith("tab-")) { setActiveTab(action.replace("tab-", "") as any); }
    else if (action === "refresh") { window.location.reload(); }
    else if (action === "toggle-theme") { cycleTheme(); }
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4">
            <div className="rounded-2xl border border-app-border bg-app-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-app-border/50">
                <Search className="h-4 w-4 text-app-text-muted shrink-0" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="명령어 검색..." autoFocus autoComplete="off"
                  className="flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-muted" />
                <button onClick={() => setOpen(false)} className="text-app-text-muted hover:text-app-text"><X className="h-4 w-4" /></button>
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {results.map(cmd => (
                  <button key={cmd.id} onClick={() => execute(cmd.action)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-app-text hover:bg-app-card-hover active:scale-[0.98] transition-all">
                    <span>{cmd.icon}</span>
                    <div className="flex-1 text-left"><span>{cmd.label}</span><span className="ml-2 text-[10px] text-app-text-muted">{cmd.category}</span></div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
