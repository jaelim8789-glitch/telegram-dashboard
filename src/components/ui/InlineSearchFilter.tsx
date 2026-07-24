"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

export function InlineSearchFilter({ data, onFilter, placeholder = "검색..." }: { data: unknown[]; onFilter: (filtered: unknown[]) => void; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (!query.trim()) onFilter(data);
      else { const lower = query.toLowerCase(); onFilter(data.filter((d: any) => JSON.stringify(d).toLowerCase().includes(lower))); }
    }, 200);
  }, [query, data, onFilter]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-bg px-3 py-2">
      <Search className="h-4 w-4 text-app-text-muted shrink-0" />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder} autoComplete="off" className="flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-muted" />
      {query && <button onClick={() => setQuery("")} className="text-app-text-muted hover:text-app-text"><X className="h-4 w-4" /></button>}
    </div>
  );
}
