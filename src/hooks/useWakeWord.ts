"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WakeWordOptions {
  wakeWord?: string;
  enabled?: boolean;
  onWake: (command: string) => void;
}

/**
 * Wake Word Voice Command — "텔레몬" 연속 음성 감지
 */
export function useWakeWord({ wakeWord = "텔레몬", enabled = false, onWake }: WakeWordOptions) {
  const [listening, setListening] = useState(false);
  const [command, setCommand] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setCommand(transcript);

      const lower = transcript.toLowerCase();
      if (lower.includes(wakeWord.toLowerCase())) {
        const afterWake = transcript.substring(lower.indexOf(wakeWord.toLowerCase()) + wakeWord.length).trim();
        if (afterWake.length > 2) {
          onWake(afterWake);
          setCommand("");
        }
      }
    };

    rec.onerror = () => { setListening(false); setTimeout(() => { try { rec.start(); setListening(true); } catch {} }, 1000); };
    rec.onend = () => { if (enabled) { try { rec.start(); } catch {} } };

    try { rec.start(); setListening(true); } catch {}
    recognitionRef.current = rec;

    return () => { try { rec.stop(); } catch {} };
  }, [enabled, wakeWord, onWake]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); setListening(false); } catch {}
    }
  }, []);

  return { listening, command, toggle };
}
