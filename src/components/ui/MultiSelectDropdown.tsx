"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function MultiSelectDropdown({ options, selected, onChange, placeholder = "선택..." }: { options: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text outline-none">
        <span className="truncate">{selected.length > 0 ? `${selected.length}개 선택` : placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 text-app-text-muted transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-app-border bg-app-card shadow-xl max-h-48 overflow-y-auto">
            {options.map(o => (
              <button key={o.id} onClick={() => toggle(o.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-app-card-hover text-app-text">
                <div className={cn("h-4 w-4 rounded border flex items-center justify-center", selected.includes(o.id) ? "bg-app-primary border-app-primary" : "border-app-border")}>
                  {selected.includes(o.id) && <Check className="h-3 w-3 text-white" />}
                </div>
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
