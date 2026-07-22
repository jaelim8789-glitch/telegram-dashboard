"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, X } from "lucide-react";

export function EditModeIndicator({ isEditing, onExit, label = "위젯 편집 중" }: { isEditing: boolean; onExit: () => void; label?: string }) {
  return (
    <AnimatePresence>
      {isEditing && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="flex items-center justify-between bg-amber-600 px-4 py-2">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-white" />
              <span className="text-xs font-medium text-white">{label}</span>
            </div>
            <button onClick={onExit} className="flex items-center gap-1 text-xs text-white/80 hover:text-white"><X className="h-3.5 w-3.5" /> 나가기</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
