"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/cn";

export function VoiceMemoRecorder({ onTranscribe }: { onTranscribe: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  function toggle() {
    if (recording) {
      recognitionRef.current?.stop();
      clearInterval(timerRef.current);
      setRecording(false);
      setDuration(0);
    } else {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const r = new SpeechRecognition();
        r.lang = "ko-KR"; r.interimResults = true; r.continuous = true;
        r.onresult = (e: any) => {
          const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
          if (e.results[e.results.length - 1].isFinal) onTranscribe(t);
        };
        r.start(); recognitionRef.current = r;
        setRecording(true);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      } catch (e) { console.warn('Unhandled error in VoiceMemoRecorder', e) }
    }
  }

  useEffect(() => () => { clearInterval(timerRef.current); recognitionRef.current?.stop(); }, []);

  return (
    <button onClick={toggle} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90", recording ? "bg-red-500 animate-pulse" : "border border-app-border text-app-text-muted hover:text-app-text")} aria-label={recording ? "?�음 중�?" : "?�성 메모"}>
      {recording ? <Square className="h-4 w-4 text-white" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
