"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Grid, X, Move } from "lucide-react";
import { cn } from "@/lib/cn";

const WIDGET_OPTIONS = [
  { id: "daily-digest", label: "?¼ì¼ ?”ì•½", default: true },
  { id: "realtime-metrics", label: "?¤ì‹œê°?ë©”íŠ¸ë¦?, default: true },
  { id: "health-score", label: "ê³„ì • ê±´ê°•", default: true },
  { id: "usage-chart", label: "?¬ìš©??ì°¨íŠ¸", default: true },
  { id: "usage-progress", label: "ëª©í‘œ ì§„í–‰ë¥?, default: false },
  { id: "recent-broadcasts", label: "ìµœê·¼ ë°œì†¡", default: true },
  { id: "recurring", label: "?•ê¸° ë°œì†¡", default: false },
  { id: "timeline", label: "?€?„ë¼??, default: false },
];

const STORAGE_KEY = "telemon-widget-order";

function loadOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveOrder(ids: string[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch (e) { console.warn('Unhandled error in WidgetEditOverlay', e) } }

export function WidgetEditOverlay({ onClose }: { onClose: () => void }) {
  const [widgets, setWidgets] = useState(() => {
    const saved = loadOrder();
    return saved.length > 0 ? saved : WIDGET_OPTIONS.filter(w => w.default).map(w => w.id);
  });
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const handleSort = useCallback(() => {
    if (dragItem.current === null || dragOver.current === null) return;
    const newList = [...widgets];
    const [dragged] = newList.splice(dragItem.current, 1);
    newList.splice(dragOver.current, 0, dragged);
    setWidgets(newList);
    saveOrder(newList);
    dragItem.current = null;
    dragOver.current = null;
  }, [widgets]);

  function toggleWidget(id: string) {
    const newList = widgets.includes(id) ? widgets.filter(w => w !== id) : [...widgets, id];
    setWidgets(newList);
    saveOrder(newList);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-app-card pb-8 px-5 pt-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-app-border" />
        <h3 className="text-sm font-semibold text-app-text mb-4 flex items-center gap-2"><Grid className="h-4 w-4" /> ?„ì ¯ ?¸ì§‘</h3>
        <div className="space-y-2">
          {WIDGET_OPTIONS.map(wo => {
            const enabled = widgets.includes(wo.id);
            return (
              <div key={wo.id}
                draggable
                onDragStart={() => dragItem.current = widgets.indexOf(wo.id)}
                onDragOver={e => { e.preventDefault(); dragOver.current = widgets.indexOf(wo.id); }}
                onDragEnd={handleSort}
                className={cn("flex items-center justify-between rounded-xl px-4 py-3 transition-colors", enabled ? "bg-app-card-hover" : "opacity-50")}
              >
                <div className="flex items-center gap-3">
                  <Move className="h-4 w-4 text-app-text-muted cursor-grab" />
                  <span className="text-sm text-app-text">{wo.label}</span>
                </div>
                <button onClick={() => toggleWidget(wo.id)}
                  className={cn("h-6 w-12 rounded-full transition-colors", enabled ? "bg-app-primary" : "bg-app-border")}
                  aria-label={enabled ? "?„ì ¯ ?¨ê¸°ê¸? : "?„ì ¯ ?œì‹œ"}>
                  <div className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-6" : "translate-x-0.5")} />
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-app-primary py-3 text-sm font-semibold text-white active:scale-[0.98]">?„ë£Œ</button>
      </motion.div>
    </motion.div>
  );
}

export function WidgetEditFab({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-full bg-app-card border border-app-border text-app-text-muted hover:text-app-text hover:border-app-primary/30 active:scale-90 transition-all shadow-lg" aria-label="?„ì ¯ ?¸ì§‘">
      <Edit3 className="h-4 w-4" />
    </button>
  );
}
