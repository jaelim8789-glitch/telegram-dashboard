"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles } from "lucide-react";

export function WhatsNewCard({ features, onDismiss }: { features: { title: string; desc: string }[]; onDismiss: () => void }) {
  return (
    <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/20">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1 text-sm font-bold text-app-text"><Sparkles className="h-4 w-4 text-amber-400" /> 새로운 기능</span>
        <button onClick={onDismiss} className="text-[10px] text-app-text-muted hover:text-app-text">닫기</button>
      </div>
      <div className="space-y-2">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <Star className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
            <div><p className="text-xs font-semibold text-app-text">{f.title}</p><p className="text-[10px] text-app-text-muted">{f.desc}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
