"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useScrollStore, recordWidgetClick, getTopWidgets } from "@/lib/mobileWorkspaceUtils";
import { useDashboardStore } from "@/store/useDashboardStore";
import { GestureGuide } from "@/components/ui/GestureGuide";
import { MobileSendSheet } from "@/components/ui/MobileSendSheet";
import { NetworkStatusBar } from "@/components/ui/NetworkStatusBar";
import { cn } from "@/lib/cn";

const QUICK_ACTIONS = [
  { id: "send", label: "발송", icon: "✉️" },
  { id: "register", label: "계정등록", icon: "➕" },
  { id: "log", label: "로그", icon: "📋" },
  { id: "myai", label: "AI", icon: "🤖" },
];

export function MobileWorkspaceShell({ children, tabId }: { children: React.ReactNode; tabId: string }) {
  const setActiveTab = useDashboardStore(s => s.setActiveTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSendSheet, setShowSendSheet] = useState(false);
  const [online, setOnline] = useState(true);
  const [latency, setLatency] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const scrollStore = useScrollStore();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = scrollStore.getPosition(tabId);
    if (saved > 0) el.scrollTop = saved;
    const save = () => scrollStore.setPosition(tabId, el.scrollTop);
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  }, [tabId, scrollStore]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const measure = async () => {
      const t = Date.now();
      try { await fetch("/api/health", { method: "HEAD" }); setLatency(Date.now() - t); } catch {}
    };
    measure(); const i = setInterval(measure, 30000);
    return () => clearInterval(i);
  }, []);

  const topWidgets = getTopWidgets(4);

  return (
    <div className="flex flex-col h-full">
      <NetworkStatusBar online={online} latency={latency} />

      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-app-border/50 shrink-0" style={{ scrollbarWidth: "none" }}>
        <span className="text-[10px] font-medium text-app-text-muted shrink-0 mr-1">자주 사용</span>
        {QUICK_ACTIONS.map(qa => (
          <button key={qa.id} onClick={() => { recordWidgetClick(qa.id); setActiveTab(qa.id as any); }}
            className="flex shrink-0 items-center gap-1 rounded-full border border-app-border bg-app-card-hover px-3 py-1.5 text-[11px] text-app-text hover:border-app-primary/30 active:scale-95 transition-all">
            <span>{qa.icon}</span> {qa.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}
        role="region" aria-label="대시보드 컨텐츠">
        {children}
      </div>

      <MobileSendSheet open={showSendSheet} onClose={() => setShowSendSheet(false)} onSent={() => setActiveTab("dashboard")} />

      {showGuide && <GestureGuide onDismiss={() => setShowGuide(false)} />}
    </div>
  );
}
