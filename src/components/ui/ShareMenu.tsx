"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Download, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { captureElement, downloadImage, shareImage } from "@/lib/captureWidget";

interface ShareMenuProps { targetRef: React.RefObject<HTMLElement>; filename?: string; shareTitle?: string; className?: string; onAction?: (action: "download" | "share") => void; }

export function ShareMenu({ targetRef, filename = "widget.png", shareTitle, className, onAction }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDownload = useCallback(async () => { setBusy(true); try { const blob = await captureElement(targetRef); downloadImage(blob, filename); onAction?.("download"); } catch (e) { console.warn('Unhandled error in ShareMenu', e) } finally { setBusy(false); setOpen(false); } }, [targetRef, filename, onAction]);

  const handleShare = useCallback(async () => { setBusy(true); try { const blob = await captureElement(targetRef); await shareImage(blob, shareTitle); onAction?.("share"); } catch (e) { console.warn('Unhandled error in ShareMenu', e) } finally { setBusy(false); setOpen(false); } }, [targetRef, shareTitle, onAction]);

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      <button type="button" onClick={() => setOpen(!open)} disabled={busy} aria-label="?„ì ¯ ê³µìœ " className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors focus-ring disabled:opacity-50"><Share2 className="h-3.5 w-3.5" />{busy ? "ì²˜ë¦¬ ì¤‘â€? : "ê³µìœ "}</button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-app-border bg-app-surface p-1 shadow-xl">
          <button type="button" onClick={handleDownload} disabled={busy} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-app-text hover:bg-app-card-hover transition-colors disabled:opacity-50"><Download className="h-3.5 w-3.5" />?´ë?ì§€ë¡??€??/button>
          <button type="button" onClick={handleShare} disabled={busy} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-app-text hover:bg-app-card-hover transition-colors disabled:opacity-50"><Share2 className="h-3.5 w-3.5" />ê³µìœ ?˜ê¸°</button>
        </div>
      )}
    </div>
  );
}
