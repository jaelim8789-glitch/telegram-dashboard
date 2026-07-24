"use client";



import { useState, useEffect, useCallback } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { Plus, FolderOpen } from "lucide-react";

import { cn } from "@/lib/cn";

import { useToast } from "@/components/ui/Toast";

import { getToken } from "@/lib/auth";



const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";



interface SmartRule {

  id?: string;

  name: string;

  keywords: string[];

  color: string;

  icon: string;

}



interface SmartFoldersProps {

  onSelectFolder?: (folderName: string, dialogIds: number[]) => void;

  dialogs?: { id: number; title: string; last_message: string | null }[];

}



export function SmartFolders({ onSelectFolder, dialogs = [] }: SmartFoldersProps) {

  const { toast } = useToast();

  const token = getToken();

  const authHeaders: Record<string, string> = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const [rules, setRules] = useState<SmartRule[]>([]);

  const [categories, setCategories] = useState<Record<string, any[]>>({});

  const [showAddRule, setShowAddRule] = useState(false);

  const [newName, setNewName] = useState("");

  const [newKeywords, setNewKeywords] = useState("");

  const [activeFolder, setActiveFolder] = useState<string | null>(null);



  useEffect(() => {

    fetch(`${API_BASE}/api/smart-folders/rules`, { headers: authHeaders })

      .then((r) => r.json())

      .then(setRules)

      .catch((e) => { console.error("[SmartFolders] smart-folders rules fetch ?패", e); toast("error", "?마???더 규칙??불러?? 못했?니??); });

  }, []);



  const categorize = useCallback(async () => {

    if (dialogs.length === 0) return;

    try {

      const res = await fetch(`${API_BASE}/api/smart-folders/categorize`, {

        method: "POST",

        headers: { ...authHeaders, "Content-Type": "application/json" },

        body: JSON.stringify(dialogs),

      });

      if (res.ok) setCategories(await res.json());

    } catch (e) { console.warn('Unhandled error in SmartFolders', e) }

  }, [dialogs]);



  useEffect(() => { categorize(); }, [categorize]);



  const addRule = async () => {

    if (!newName.trim() || !newKeywords.trim()) return;

    const rule: SmartRule = {

      name: newName.trim(),

      keywords: newKeywords.split(",").map((k) => k.trim()).filter(Boolean),

      color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`,

      icon: "?",

    };

    try {

      const res = await fetch(`${API_BASE}/api/smart-folders/rules`, {

        method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" },

        body: JSON.stringify(rule),

      });

      if (res.ok) {

        const newRule = await res.json();

        setRules((prev) => [...prev, newRule]);

        setNewName(""); setNewKeywords(""); setShowAddRule(false);

        toast("success", "?더 규칙??추??었?니??);

      }

    } catch (e) { console.warn('Unhandled error in SmartFolders', e) }

  };



  const deleteRule = async (ruleId: string) => {

    try {

      await fetch(`${API_BASE}/api/smart-folders/rules/${ruleId}`, {

        method: "DELETE", headers: authHeaders,

      });

      setRules((prev) => prev.filter((r) => r.id !== ruleId));

      toast("success", "규칙?????었?니??);

    } catch (e) { console.warn('Unhandled error in SmartFolders', e) }

  };



  const totalCount = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);



  return (

    <div className="rounded-2xl border border-app-border bg-app-card p-3">

      <div className="flex items-center justify-between mb-2">

        <div className="flex items-center gap-1.5">

          <FolderOpen className="h-3.5 w-3.5 text-app-primary" />

          <span className="text-xs font-semibold text-app-text">?마???더</span>

          <span className="text-[9px] text-app-text-muted">({totalCount}????</span>

        </div>

        <button onClick={() => setShowAddRule(!showAddRule)} className="flex items-center gap-1 rounded-lg bg-app-primary/10 px-2 py-1 text-[9px] text-app-primary hover:bg-app-primary/20 transition-colors">

          <Plus className="h-3 w-3" /> 규칙

        </button>

      </div>



      <AnimatePresence>

        {showAddRule && (

          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2">

            <div className="space-y-1.5 rounded-xl bg-app-card-hover p-2">

              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="?더 ?름 (?? 고객문의)"

                className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-[10px] text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary" />

              <input value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} placeholder="?워??(?표?구분, ?? 문의,견적,가?"

                className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-[10px] text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary" />

              <div className="flex gap-1">

                <button onClick={addRule} className="flex-1 rounded-lg bg-app-primary py-1 text-[9px] font-semibold text-white hover:opacity-90 transition-opacity">

                  추?

                </button>

                <button onClick={() => setShowAddRule(false)} className="rounded-lg bg-app-card-hover px-3 py-1 text-[9px] text-app-text-muted hover:text-app-text transition-colors">

                  취소

                </button>

              </div>

            </div>

          </motion.div>

        )}

      </AnimatePresence>



      <div className="space-y-0.5 max-h-48 overflow-y-auto">

        {Object.entries(categories).map(([name, items]) => {

          if (items.length === 0 && name === "기?") return null;

          return (

            <button key={name} onClick={() => {

              setActiveFolder(activeFolder === name ? null : name);

              onSelectFolder?.(name, items.map((d) => d.id));

            }}

              className={cn(

                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] transition-all",

                activeFolder === name ? "bg-app-primary/10 text-app-primary" : "hover:bg-app-card-hover text-app-text"

              )}

            >

              <span className="text-xs">{rules.find((r) => r.name === name)?.icon || "?"}</span>

              <span className="flex-1 text-left truncate">{name}</span>

              <span className={cn(

                "flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[8px] font-bold",

                items.length > 0 ? "bg-app-primary/20 text-app-primary" : "text-app-text-muted"

              )}>

                {items.length > 99 ? "99+" : items.length}

              </span>

            </button>

          );

        })}

      </div>

    </div>

  );

}

