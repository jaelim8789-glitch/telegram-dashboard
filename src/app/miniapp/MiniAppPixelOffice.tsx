"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Plus, Zap, X } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import { useToastStore } from "@/components/ui/GlobalToast";

interface PixelOfficeStaff {
  id: string;
  name: string;
  emoji: string;
  status: "online" | "busy" | "idle";
  role: string;
}

const DEFAULT_STAFF: PixelOfficeStaff[] = [
  { id: "boss", name: "?¬ì¥", emoji: "?‘¨?ğŸ’?, status: "online", role: "?? },
  { id: "telemon-ai", name: "AI ?”ë ˆëª?, emoji: "?¤–", status: "online", role: "?ë™ ?‘ë‹µ" },
];

const STATUS_LABELS: Record<string, string> = { online: "online", busy: "busy", idle: "idle" };
const STATUS_FILTERS = ["?„ì²´", "online", "busy", "idle"] as const;

export const MiniAppPixelOffice = memo(function MiniAppPixelOffice() {
  const [staff, setStaff] = useState<PixelOfficeStaff[]>(DEFAULT_STAFF);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"?„ì²´" | "online" | "busy" | "idle">("?„ì²´");
  const toast = useToastStore(s => s.add);

  const filteredStaff = statusFilter === "?„ì²´" ? staff : staff.filter(s => s.status === statusFilter);

  function handleCreateStaff() {
    try { hapticFeedback.impactOccurred("medium"); } catch (e) { console.warn('Unhandled error in MiniAppPixelOffice', e) }
    const newStaff: PixelOfficeStaff = {
      id: `staff-${Date.now()}`,
      name: `AI ì§ì› ${staff.length - 1}??,
      emoji: ["?§‘?ğŸ’?, "?‘©?ğŸ’?, "?‘¨?ğŸ”?, "?‘©?ğŸ”?, "?§™?â™‚ï¸?][(staff.length - 2) % 5],
      status: "idle",
      role: "AI ?´ì‹œ?¤í„´??,
    };
    setStaff(prev => [...prev, newStaff]);
    setShowCreateStaff(false);
    toast({ type: "success", title: "AI ì§ì› ?ì„± ?„ë£Œ!", message: `${newStaff.name}??ê°€) PixelOffice???©ë¥˜?ˆìŠµ?ˆë‹¤.` });
  }

  function toggleStatus(id: string) {
    try { hapticFeedback.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in MiniAppPixelOffice', e) }
    setStaff(prev => prev.map(s => {
      if (s.id !== id) return s;
      const next: Record<string, PixelOfficeStaff["status"]> = { online: "busy", busy: "idle", idle: "online" };
      return { ...s, status: next[s.status] };
    }));
  }

  function deleteStaff(id: string) {
    if (id === "boss") return;
    try { hapticFeedback.impactOccurred("heavy"); } catch (e) { console.warn('Unhandled error in MiniAppPixelOffice', e) }
    setStaff(prev => prev.filter(s => s.id !== id));
    toast({ type: "info", title: "ì§ì› ?´ì‚¬", message: "AI ì§ì›??PixelOfficeë¥?? ë‚¬?µë‹ˆ??" });
  }

  return (
    <div className="p-4 pb-8 space-y-4 max-w-2xl mx-auto">
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(82, 136, 193, 0.15), rgba(168, 85, 247, 0.08))" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold flex items-center gap-1.5" style={{ fontFamily: "var(--font-heading)" }}>
            <Sparkles className="h-4 w-4 text-amber-400" /> PixelOffice
          </h2>
          <button onClick={() => { try { hapticFeedback.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in MiniAppPixelOffice', e) }; setShowCreateStaff(true); }}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-medium active:scale-95"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
            <Plus className="h-3 w-3" /> AI ì§ì› ?ì„±
          </button>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all active:scale-90 ${statusFilter === f ? "text-white" : "opacity-60"}`}
              style={{ backgroundColor: statusFilter === f ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-section-bg-color, #232e3c)", color: statusFilter === f ? "#fff" : "var(--tg-theme-text-color, #f5f5f5)" }}>
              {f === "?„ì²´" ? "?„ì²´" : `?Ÿ¢ ${f}`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredStaff.map(s => (
              <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-xl p-3 flex flex-col items-center gap-1.5 relative"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
                <button onClick={() => deleteStaff(s.id)} className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full opacity-40 hover:opacity-100"
                  style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
                  <X className="h-3 w-3" />
                </button>
                <div className={`relative flex h-12 w-12 items-center justify-center rounded-full text-2xl cursor-pointer active:scale-90
                  ${s.status === "online" ? "ring-2 ring-emerald-500" : s.status === "busy" ? "ring-2 ring-amber-500" : "ring-1 ring-white/10"}`}
                  onClick={() => toggleStatus(s.id)}>
                  {s.emoji}
                  {s.status === "online" && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2" style={{ borderColor: "var(--tg-theme-section-bg-color, #232e3c)" }} />}
                  {s.status === "busy" && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-amber-500 border-2" style={{ borderColor: "var(--tg-theme-section-bg-color, #232e3c)" }} />}
                  {s.status === "idle" && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-400 border-2" style={{ borderColor: "var(--tg-theme-section-bg-color, #232e3c)" }} />}
                </div>
                <span className="text-xs font-semibold truncate max-w-[90px]" style={{ color: "var(--tg-theme-text-color, #f5f5f5)" }}>{s.name}</span>
                <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{s.role}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {staff.length <= 2 && (
          <p className="text-[10px] text-center mt-3" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            AI ì§ì›???ì„±?˜ë©´ PixelOffice??ì¶”ê??©ë‹ˆ??
          </p>
        )}
      </div>

      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <p className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
          ì´?<span className="font-semibold text-emerald-400">{staff.length}ëª?/span>???¤íƒœ????" "}
          {staff.filter(s => s.status === "online").length}ëª?online
        </p>
      </div>

      <AnimatePresence>
        {showCreateStaff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateStaff(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="mx-4 w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}
              style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "var(--tg-theme-text-color, #f5f5f5)" }}>?¤– AI ì§ì› ?ì„±</h3>
              <p className="text-xs mb-4" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
                ??AI ì§ì›??PixelOffice???©ë¥˜?©ë‹ˆ?? ?ë™?¼ë¡œ ë°œì†¡/?‘ë‹µ???„ì?ì¤ë‹ˆ??
              </p>
              <button onClick={handleCreateStaff}
                className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 text-sm font-semibold text-white active:scale-[0.98]">
                <Zap className="h-4 w-4 inline mr-1" /> AI ì§ì› ?ì„±?˜ê¸°
              </button>
              <button onClick={() => setShowCreateStaff(false)}
                className="w-full mt-2 rounded-xl py-2.5 text-xs font-medium"
                style={{ color: "var(--tg-theme-hint-color, #708499)" }}>ì·¨ì†Œ</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
