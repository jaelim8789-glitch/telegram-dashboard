"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MentionAutocomplete({ text, onChange, accounts }: { text: string; onChange: (v: string) => void; accounts: { id: string; phone: string }[] }) {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filtered = query ? accounts.filter(a => a.phone.includes(query)) : accounts;

  function handleChange(v: string) {
    onChange(v);
    const atIdx = v.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || v[atIdx - 1] === " ")) {
      setQuery(v.slice(atIdx + 1));
      setShow(true);
      setCursor(atIdx);
    } else { setShow(false); }
  }

  function selectMention(phone: string) {
    const before = text.slice(0, cursor);
    const after = text.slice(cursor + query.length + 1);
    onChange(before + phone + " " + after);
    setShow(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <textarea ref={inputRef} value={text} onChange={e => handleChange(e.target.value)} className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none resize-none" rows={4} />
      <AnimatePresence>
        {show && filtered.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-app-border bg-app-card shadow-xl overflow-hidden">
            {filtered.slice(0, 5).map(a => (
              <button key={a.id} onClick={() => selectMention(a.phone)} className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-app-card-hover text-app-text">{a.phone}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
