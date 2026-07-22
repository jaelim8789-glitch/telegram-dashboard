"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { WhisperData } from "@/types/ai-whisper";
import { aiChat } from "@/lib/ai/ai-chat";
import { whisperSystemPrompt } from "@/lib/ai/whisper-prompt";

const CACHE_PREFIX = "whisper_";
const AUTO_DISMISS_MS = 10_000;
const MAX_LOAD_MS = 2_000;
const RECENT_MSG_COUNT = 10;

function cacheKey(chatId: string) {
  return `${CACHE_PREFIX}${chatId}`;
}

function readCache(chatId: string): WhisperData | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(chatId));
    if (!raw) return null;
    return JSON.parse(raw) as WhisperData;
  } catch {
    return null;
  }
}

function writeCache(chatId: string, data: WhisperData) {
  try {
    sessionStorage.setItem(cacheKey(chatId), JSON.stringify(data));
  } catch {}
}

interface Options {
  customerName?: string;
  recentMessages?: { role: string; content: string }[];
}

export function useAiWhisper(chatId: string | null, options: Options = {}) {
  const [whisper, setWhisper] = useState<WhisperData | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const dismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchWhisper = useCallback(
    async (id: string) => {
      if (seenRef.current.has(id)) return;

      const cached = readCache(id);
      if (cached) {
        setWhisper(cached);
        setVisible(true);
        seenRef.current.add(id);
        setDismissed(false);
        timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
        return;
      }

      setLoading(true);
      setDismissed(false);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, MAX_LOAD_MS);

      try {
        const payload = `고객명: ${options.customerName || "고객"}
메시지:
${(options.recentMessages || []).slice(0, RECENT_MSG_COUNT).map((m) => `[${m.role}] ${m.content}`).join("\n")}

이 고객에 대한 Whisper 분석을 위 시스템 프롬프트 규칙에 따라 JSON으로 응답하세요.`;

        const response = await aiChat({
          messages: [
            { role: "system", content: whisperSystemPrompt },
            { role: "user", content: payload },
          ],
          stream: false,
        });

        clearTimeout(timeoutId);
        if (controller.signal.aborted) return;

        const cleaned = response.content
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();

        const data: WhisperData = JSON.parse(cleaned);
        writeCache(id, data);
        setWhisper(data);
        setVisible(true);
        seenRef.current.add(id);
        timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
      } catch {
        setWhisper(null);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [options.customerName, options.recentMessages, dismiss],
  );

  useEffect(() => {
    if (chatId && !seenRef.current.has(chatId)) {
      fetchWhisper(chatId);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      abortRef.current?.abort();
    };
  }, [chatId, fetchWhisper]);

  const send = useCallback(async () => {
    dismiss();
  }, [dismiss]);

  const editAndSend = useCallback(async (_newMessage: string) => {
    dismiss();
  }, [dismiss]);

  const show = useCallback(() => {
    setDismissed(false);
    setVisible(true);
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
  }, [dismiss]);

  return {
    whisper: visible ? whisper : null,
    loading,
    dismissed,
    send,
    dismiss,
    editAndSend,
    show,
  };
}
