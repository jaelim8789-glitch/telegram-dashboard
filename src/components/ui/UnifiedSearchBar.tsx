"use client";

import { useState, useCallback, useRef } from "react";
import { Search, X, Loader2, Phone, MessageSquare, Users } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

interface SearchResult { id: string; type: "account" | "group" | "broadcast" | "log"; label: string; sublabel: string; icon: typeof Phone; }

export function UnifiedSearchBar({ className, onResultSelect }: { className?: string; onResultSelect?: (result: SearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults((data.accounts || []).map((a: any) => ({ id: a.id, type: "account", label: a.phone, sublabel: `${a.todaySent || 0}회 발송`, icon: Phone }))
        .concat((data.groups || []).map((g: any) => ({ id: g.id, type: "group", label: g.title, sublabel: `${g.memberCount || 0}명`, icon: Users })))
        .concat((data.broadcasts || []).map((b: any) => ({ id: b.id, type: "broadcast", label: b.message?.slice(0, 40), sublabel: b.status, icon: MessageSquare })))
        .slice(0, 10));
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  function handleChange(v: string) {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
    setShow(v.length >= 2);
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card-hover px-3 py-2">
        <Search className="h-4 w-4 text-app-text-muted shrink-0" />
        <input ref={inputRef} value={query} onChange={e => handleChange(e.target.value)} onFocus={() => setShow(query.length >= 2)} placeholder="계정/그룹/로그 검색..." autoComplete="off" className="flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-muted" aria-label="통합 검색" />
        {query && <button onClick={() => { setQuery(""); setResults([]); setShow(false); inputRef.current?.focus(); }} className="text-app-text-muted hover:text-app-text"><X className="h-4 w-4" /></button>}
      </div>
      {show && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 max-h-60 overflow-y-auto rounded-xl border border-app-border bg-app-card shadow-xl">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-app-text-muted" /></div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-xs text-app-text-muted">{query.length >= 2 ? "검색 결과가 없습니다" : "2글자 이상 입력하세요"}</p>
          ) : (
            results.map(r => {
              const Icon = r.icon;
              return (
                <button key={`${r.type}-${r.id}`} onClick={() => { onResultSelect?.(r); setShow(false); setQuery(""); }}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-app-card-hover transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-card-hover"><Icon className="h-4 w-4 text-app-text-muted" /></div>
                  <div className="text-left min-w-0"><p className="text-sm text-app-text truncate">{r.label}</p><p className="text-[11px] text-app-text-muted">{r.sublabel}</p></div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
