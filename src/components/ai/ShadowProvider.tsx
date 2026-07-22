"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAiShadow, type CustomerMessage, type ShadowAlert } from "@/hooks/useAiShadow";
import { ShadowAlertPanel } from "@/components/ai/ShadowAlertPanel";
import { cn } from "@/lib/cn";

interface ShadowProviderProps {
  customerMessages?: CustomerMessage[];
  onSendReply?: (chatId: string, reply: string) => void;
  onUserReplied?: (chatId: string) => void;
}

export function ShadowProvider({
  customerMessages = [],
  onSendReply,
  onUserReplied,
}: ShadowProviderProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [badgeFlash, setBadgeFlash] = useState(false);
  const prevCountRef = useRef(0);

  const {
    alerts,
    settings,
    dismissAlert,
    handleUserReplied,
    regenerateReply,
    sendReply,
  } = useAiShadow(customerMessages, onSendReply);

  useEffect(() => {
    if (alerts.length > prevCountRef.current && prevCountRef.current > 0) {
      setBadgeFlash(true);
      const timer = setTimeout(() => setBadgeFlash(false), 2000);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = alerts.length;
  }, [alerts.length]);

  const handleSend = useCallback((alert: ShadowAlert, editedMessage?: string) => {
    sendReply(alert, editedMessage);
  }, [sendReply]);

  const handleUserReply = useCallback((chatId: string) => {
    handleUserReplied(chatId);
    onUserReplied?.(chatId);
  }, [handleUserReplied, onUserReplied]);

  if (!settings.enabled) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-80 rounded-2xl border border-app-border/50 bg-app-surface shadow-2xl overflow-hidden"
              style={{ maxHeight: "60vh" }}
            >
              <ShadowAlertPanel
                alerts={alerts}
                onSend={handleSend}
                onDismiss={dismissAlert}
                onRegenerate={regenerateReply}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {alerts.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPanelOpen((v) => !v)}
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors",
              badgeFlash
                ? "bg-amber-500"
                : panelOpen
                  ? "bg-app-primary"
                  : "bg-app-card-hover border border-app-border"
            )}
          >
            {panelOpen ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <>
                <Bell className={cn("h-5 w-5", badgeFlash ? "text-white" : "text-app-text")} />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {alerts.length > 9 ? "9+" : alerts.length}
                </span>
              </>
            )}
          </motion.button>
        )}
      </div>
    </>
  );
}
