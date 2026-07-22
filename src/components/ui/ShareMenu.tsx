"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Download, Image } from "lucide-react";
import { cn } from "@/lib/cn";
import { captureElement, downloadImage, shareImage } from "@/lib/captureWidget";

interface ShareMenuProps {
  targetRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

export function ShareMenu({ targetRef, className }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleSaveImage() {
    setCapturing(true);
    const blob = await captureElement(targetRef);
    if (blob) await downloadImage(blob);
    setCapturing(false);
    setOpen(false);
  }

  async function handleShare() {
    setCapturing(true);
    const blob = await captureElement(targetRef);
    if (blob) await shareImage(blob);
    setCapturing(false);
    setOpen(false);
  }

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={capturing}
        className="flex items-center gap-1.5 rounded-lg border border-app-border/60 bg-app-card px-3 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text hover:border-app-border-strong transition-colors disabled:opacity-50"
      >
        <Share2 className="h-3.5 w-3.5" />
        {capturing ? "캡처 중..." : "공유"}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-app-border bg-app-card shadow-xl"
            >
              <button
                type="button"
                onClick={handleSaveImage}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-app-text hover:bg-app-card-hover transition-colors"
              >
                <Image className="h-4 w-4 text-app-text-muted" />
                이미지로 저장
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-app-text hover:bg-app-card-hover transition-colors"
              >
                <Share2 className="h-4 w-4 text-app-text-muted" />
                공유하기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
