"use client";

import { useState, useRef, useEffect } from "react";
import { ImageIcon, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TemplateCard { id: string; name: string; content: string; previewUrl?: string; }

export function TemplateGalleryPreview({ templates, onSelect }: { templates: TemplateCard[]; onSelect: (t: TemplateCard) => void }) {
  const [preview, setPreview] = useState<TemplateCard | null>(null);
  const [cols, setCols] = useState(2);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {templates.map(t => (
          <button key={t.id} onClick={() => { setPreview(t); }} className="group relative rounded-xl border border-app-border bg-app-card overflow-hidden active:scale-[0.97] transition-all text-left">
            <div className="bg-gradient-to-br from-app-primary/10 to-transparent px-3 py-4 flex flex-col items-center justify-center min-h-[80px]">
              <ImageIcon className="h-6 w-6 text-app-primary/40 mb-1" />
              <span className="text-[10px] font-medium text-app-text-muted line-clamp-1">{t.name}</span>
            </div>
            <div className="px-2 py-1.5 border-t border-app-border/50">
              <span className="text-[10px] text-app-text-muted line-clamp-1">{t.content.slice(0, 30)}</span>
            </div>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-app-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-bold text-app-text mb-1">{preview.name}</p>
              <div className="rounded-xl border border-app-border bg-app-bg p-4 mb-3">
                <p className="text-sm text-app-text whitespace-pre-wrap">{preview.content}</p>
              </div>
              <button onClick={() => { onSelect(preview); setPreview(null); }} className="w-full rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white active:scale-[0.98]">
                이 템플릿 사용
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
