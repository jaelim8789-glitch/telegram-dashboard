"use client";

import { Send, Workflow, Search, Filter, RefreshCw } from "lucide-react";
import { useCategoryStore } from "@/store/useCategoryStore";

export function NicegramToolbar() {
  const setCategory = useCategoryStore((s) => s.setCategory);

  return (
    <div className="flex items-center gap-1.5 border-b border-app-border bg-app-surface px-3 py-2">
      {/* Title */}
      <h1 className="text-sm font-semibold text-app-text mr-2">Nicegram</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
        title="°Ë»ö"
        aria-label="°Ë»ö"
      >
        <Search className="h-3.5 w-3.5" />
      </button>

      {/* Filter */}
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
        title="ÇÊÅÍ"
        aria-label="ÇÊÅÍ"
      >
        <Filter className="h-3.5 w-3.5" />
      </button>

      {/* Refresh */}
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
        title="»õ·Î°íÄ§"
        aria-label="»õ·Î°íÄ§"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>

      {/* Divider */}
      <div className="mx-1 h-5 w-px bg-app-border" />

      {/* Send button ¡æ /send category */}
      <button
        type="button"
        onClick={() => setCategory("send")}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-app-text hover:bg-app-card-hover transition-colors"
        title="¹ß¼ÛÀ¸·Î ÀÌµ¿"
        aria-label="¹ß¼ÛÀ¸·Î ÀÌµ¿"
      >
        <Send className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">¹ß¼Û</span>
      </button>

      {/* Macro button ¡æ /macro category */}
      <button
        type="button"
        onClick={() => setCategory("macro")}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-app-text hover:bg-app-card-hover transition-colors"
        title="¸ÅÅ©·Î·Î ÀÌµ¿"
        aria-label="¸ÅÅ©·Î·Î ÀÌµ¿"
      >
        <Workflow className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">¸ÅÅ©·Î</span>
      </button>
    </div>
  );
}
