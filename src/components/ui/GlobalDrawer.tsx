"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDrawer } from "@/store/useDrawer";

export function GlobalDrawer() {
  const { open, content, data, closeDrawer } = useDrawer();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={closeDrawer} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-2xl bg-app-card pb-8 shadow-2xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-app-border" />
            <div className="px-5 py-2 border-b border-app-border/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-app-text">{content}</span>
              <button onClick={closeDrawer} className="text-xs text-app-text-muted hover:text-app-text">닫기</button>
            </div>
            <div className="px-5 py-3 overflow-y-auto max-h-[calc(80vh-80px)]">{data}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
