"use client";

import { useState, useCallback } from "react";
import { useToastStore } from "@/components/ui/GlobalToast";

export function useNotificationSound() {
  const toast = useToastStore(s => s.add);
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("telemon-notification-sounds") || "{}"); } catch { return {}; }
  });

  const play = useCallback((accountId: string, event: string) => {
    const sound = settings[accountId] || "default";
    if (sound === "none") return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = sound === "urgent" ? 880 : 440;
      gain.gain.value = 0.1;
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, [settings]);

  const setSound = useCallback((accountId: string, sound: string) => {
    const next = { ...settings, [accountId]: sound };
    setSettings(next);
    try { localStorage.setItem("telemon-notification-sounds", JSON.stringify(next)); } catch {}
  }, [settings]);

  return { play, setSound, settings };
}

export function NotificationSoundSettings({ accountId, current, onChange }: { accountId: string; current: string; onChange: (sound: string) => void }) {
  const sounds = [
    { id: "default", label: "기본" },
    { id: "urgent", label: "긴급 (높은음)" },
    { id: "gentle", label: "부드러운" },
    { id: "none", label: "끄기" },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {sounds.map(s => (
        <button key={s.id} onClick={() => onChange(s.id)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-medium active:scale-95 ${s.id === current ? "bg-app-primary text-white" : "border border-app-border text-app-text-muted"}`}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
