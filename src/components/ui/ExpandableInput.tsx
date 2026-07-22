"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

export function ExpandableInput({ defaultValue, onSave, placeholder, rows = 3 }: { defaultValue: string; onSave: (v: string) => void; placeholder?: string; rows?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((v: string) => {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSaving(true); onSave(v); setTimeout(() => setSaving(false), 800); }, 1000);
  }, [onSave]);

  return (
    <div className="relative">
      <textarea value={value} onChange={e => handleChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none resize-none transition-all focus:border-app-primary" />
      {saving && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-2 right-2 text-[10px] text-app-text-muted">저장됨</motion.span>}
    </div>
  );
}
