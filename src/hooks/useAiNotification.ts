"use client";

import { useEffect, useRef, useCallback } from "react";
import { vibrate } from "@/lib/vibrate";

/**
 * AI Response Notification — 응답 도착 시 햅틱 + 선택적 사운드
 */
export function useAiNotification(enabled = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    try {
      const audio = new Audio();
      // Simple silent beep using AudioContext (no external file needed)
      audio.volume = 0.1;
      audioRef.current = audio;
    } catch {}
    return () => { audioRef.current = null; };
  }, []);

  const notify = useCallback(() => {
    if (!enabledRef.current) return;
    vibrate("notification");
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  return notify;
}
