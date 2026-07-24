"use client";



import { useState, useCallback, useMemo } from "react";

import { create } from "zustand";



interface Shortcut { key: string; expansion: string; }

interface ShortcutStore { shortcuts: Shortcut[]; add: (k: string, e: string) => void; remove: (k: string) => void; }

const STORAGE_KEY = "telemon-shortcuts";

function load(): Shortcut[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }

function save(s: Shortcut[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { console.warn('Unhandled error in TextExpander', e) } }



const DEFAULTS: Shortcut[] = [

  { key: "/hi", expansion: "?녕?세?? TeleMon?니??" },

  { key: "/evt", expansion: "[?벤???내] 지?바로 ?인?보?요!" },

  { key: "/thx", expansion: "감사?니?? 좋? ?루 ?세??" },

];



export const useShortcutStore = create<ShortcutStore>((set) => ({

  shortcuts: load().length > 0 ? load() : DEFAULTS,

  add: (key, expansion) => set(s => { const next = [...s.shortcuts.filter(x => x.key !== key), { key, expansion }]; save(next); return { shortcuts: next }; }),

  remove: (key) => set(s => { const next = s.shortcuts.filter(x => x.key !== key); save(next); return { shortcuts: next }; }),

}));



export function useTextExpander() {

  const shortcuts = useShortcutStore(s => s.shortcuts);



  const expand = useCallback((text: string): string => {

    let result = text;

    for (const s of shortcuts) { result = result.replace(new RegExp(s.key + "\\b", "g"), s.expansion); }

    return result;

  }, [shortcuts]);



  return { expand, shortcuts };

}



export function ShortcutEditor() {

  const shortcuts = useShortcutStore(s => s.shortcuts);

  const add = useShortcutStore(s => s.add);

  const remove = useShortcutStore(s => s.remove);

  const [key, setKey] = useState("");

  const [exp, setExp] = useState("");



  function handleAdd() { if (key.trim() && exp.trim()) { add(key.trim(), exp.trim()); setKey(""); setExp(""); } }



  return (

    <div className="space-y-2">

      <p className="text-xs font-semibold text-app-text">?축??/p>

      {shortcuts.map(s => (

        <div key={s.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-app-card-hover">

          <code className="text-xs font-mono text-app-primary bg-app-primary/10 px-1.5 py-0.5 rounded shrink-0">{s.key}</code>

          <span className="text-xs text-app-text-muted truncate flex-1">{s.expansion}</span>

          <button onClick={() => remove(s.key)} className="text-[10px] text-app-text-muted hover:text-app-danger">??</button>

        </div>

      ))}

      <div className="flex gap-2">

        <input value={key} onChange={e => setKey(e.target.value)} placeholder="/?워?? className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none" />

        <input value={exp} onChange={e => setExp(e.target.value)} placeholder="?장 문구" className="flex-[2] rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none" />

        <button onClick={handleAdd} className="rounded-lg bg-app-primary px-3 py-2 text-xs font-semibold text-white active:scale-95">추?</button>

      </div>

    </div>

  );

}

