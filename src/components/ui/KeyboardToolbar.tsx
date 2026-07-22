"use client";

import { useState, useRef, useEffect } from "react";
import { Bold, Italic, Link, Smile, Clock } from "lucide-react";

const TOOLS = [
  { icon: Bold, label: "굵게", action: (s: string, sel: { start: number; end: number }) => s.slice(0, sel.start) + "**" + s.slice(sel.start, sel.end) + "**" + s.slice(sel.end) },
  { icon: Italic, label: "기울임", action: (s: string, sel: { start: number; end: number }) => s.slice(0, sel.start) + "*" + s.slice(sel.start, sel.end) + "*" + s.slice(sel.end) },
  { icon: Link, label: "링크", action: (s: string, sel: { start: number; end: number }) => s.slice(0, sel.start) + "[텍스트](url)" + s.slice(sel.end) },
  { icon: Clock, label: "템플릿", action: (s: string) => s + "\n[템플릿 불러오기]" },
];

export function KeyboardToolbar({ textareaRef, onInsert }: { textareaRef: React.RefObject<HTMLTextAreaElement>; onInsert?: (text: string) => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    function onFocus() { setShow(true); }
    function onBlur() { setTimeout(() => setShow(false), 200); }
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => { el.removeEventListener("focus", onFocus); el.removeEventListener("blur", onBlur); };
  }, [textareaRef]);

  function handleAction(act: (s: string, sel: { start: number; end: number }) => string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const newVal = act(el.value, { start, end });
    el.value = newVal;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    el.selectionStart = el.selectionEnd = start + (newVal.length - el.value.length > 0 ? 2 : 0);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-1 border-t border-app-border bg-app-card px-2 py-1.5"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {TOOLS.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.label} onClick={() => handleAction(t.action)} className="flex h-9 w-9 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text active:scale-90">
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
