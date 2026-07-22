"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToastStore } from "@/components/ui/GlobalToast";

type RetentionEvent = "account_added" | "broadcast_sent" | "broadcast_failed" | "login" | "logout" | "upgrade";

export function useRetentionTracker() {
  const [events, setEvents] = useState<RetentionEvent[]>(() => {
    try { return JSON.parse(localStorage.getItem("telemon-retention") || "[]"); } catch { return []; }
  });
  const toast = useToastStore(s => s.add);

  const track = useCallback((event: RetentionEvent) => {
    const next = [...events, event].slice(-50);
    setEvents(next);
    try { localStorage.setItem("telemon-retention", JSON.stringify(next)); } catch {}
  }, [events]);

  const milestones: Record<string, { check: () => boolean; message: string }> = {
    first_send: { check: () => events.filter(e => e === "broadcast_sent").length === 1, message: "🎉 첫 발송을 축하합니다!" },
    tenth_send: { check: () => events.filter(e => e === "broadcast_sent").length === 10, message: "🎉 10회 발송 달성!" },
    first_account: { check: () => events.filter(e => e === "account_added").length === 1, message: "🎉 첫 계정 연결 완료!" },
  };

  useEffect(() => {
    Object.entries(milestones).forEach(([, m]) => { if (m.check()) toast({ type: "success", title: m.message }); });
  }, [events]);

  return { track, events };
}
