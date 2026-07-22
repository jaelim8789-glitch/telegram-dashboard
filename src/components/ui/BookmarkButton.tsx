"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBookmarkStore } from "@/store/useBookmarkStore";

export function BookmarkButton({ id, type, label, sublabel, className }: { id: string; type: "account" | "broadcast" | "log" | "message"; label: string; sublabel?: string; className?: string }) {
  const add = useBookmarkStore(s => s.add);
  const remove = useBookmarkStore(s => s.remove);
  const has = useBookmarkStore(s => s.has(id));
  return (
    <button onClick={() => has ? remove(id) : add({ id, type, label, sublabel })} className={cn("p-1 rounded transition-colors hover:bg-app-card-hover", className)} aria-label={has ? "북마크 해제" : "북마크"}>
      {has ? <BookmarkCheck className="h-4 w-4 text-amber-400" /> : <Bookmark className="h-4 w-4 text-app-text-muted" />}
    </button>
  );
}
