"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { aiChat } from "@/lib/ai/ai-chat";
import { shadowSystemPrompt } from "@/lib/ai/shadow-prompt";

export interface CustomerMessage {
  chatId: string;
  customerName: string;
  message: string;
  receivedAt: string;
  previousMessages: string[];
}

export interface ShadowAlert {
  id: string;
  chatId: string;
  customerName: string;
  customerMessage: string;
  elapsedMinutes: number;
  suggestedReply: string;
  detectedIntent: string;
  confidence: number;
  createdAt: string;
}

export interface ShadowSettings {
  enabled: boolean;
  watchMinutes: number;
  notificationSound: boolean;
  autoReply: boolean;
}

const DEFAULT_SETTINGS: ShadowSettings = {
  enabled: true,
  watchMinutes: 20,
  notificationSound: false,
  autoReply: false,
};

const STORAGE_KEY = "telemon-shadow-settings";
const DISMISSED_KEY = "telemon-shadow-dismissed";

function loadSettings(): ShadowSettings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: ShadowSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function loadDismissed(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {}
}

function parseShadowReply(content: string): { intent: string; reply: string; confidence: number } | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.reply) {
        return {
          intent: parsed.intent || "general",
          reply: parsed.reply,
          confidence: parsed.confidence || 0.5,
        };
      }
    }
  } catch {}
  return {
    intent: "general",
    reply: content.replace(/```/g, "").trim(),
    confidence: 0.5,
  };
}

export function useAiShadow(
  customerMessages: CustomerMessage[],
  onSendReply?: (chatId: string, reply: string) => void,
) {
  const [settings, setSettings] = useState<ShadowSettings>(loadSettings);
  const [alerts, setAlerts] = useState<ShadowAlert[]>([]);
  const dismissedRef = useRef<Set<string>>(loadDismissed());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const generatedRef = useRef<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());

  const updateSettings = useCallback((partial: Partial<ShadowSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    dismissedRef.current.add(alertId);
    saveDismissed(dismissedRef.current);
  }, []);

  const dismissChatAlerts = useCallback((chatId: string) => {
    setAlerts((prev) => {
      const chatAlerts = prev.filter((a) => a.chatId === chatId);
      for (const a of chatAlerts) {
        dismissedRef.current.add(a.id);
      }
      saveDismissed(dismissedRef.current);
      return prev.filter((a) => a.chatId !== chatId);
    });
  }, []);

  const clearTimersForChat = useCallback((chatId: string) => {
    const timer = timersRef.current.get(chatId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(chatId);
    }
  }, []);

  const generateShadowReply = useCallback(async (msg: CustomerMessage) => {
    const chatKey = msg.chatId;
    if (generatedRef.current.has(chatKey)) return;
    if (processingRef.current.has(chatKey)) return;
    processingRef.current.add(chatKey);

    try {
      const context = msg.previousMessages.length > 0
        ? `이전 대화:\n${msg.previousMessages.slice(-3).join("\n")}\n\n마지막 고객 메시지: ${msg.message}`
        : `고객 메시지: ${msg.message}`;

      const result = await aiChat({
        messages: [
          { role: "system", content: shadowSystemPrompt },
          { role: "user", content: context },
        ],
        stream: false,
      });

      if (result.error) {
        return;
      }

      const parsed = parseShadowReply(result.content);
      if (!parsed) return;

      generatedRef.current.add(chatKey);

      const alertId = `shadow-${chatKey}-${Date.now()}`;

      if (!dismissedRef.current.has(alertId)) {
        setAlerts((prev) => {
          const existing = prev.find((a) => a.chatId === chatKey);
          if (existing) return prev;
          return [
            {
              id: alertId,
              chatId: msg.chatId,
              customerName: msg.customerName,
              customerMessage: msg.message,
              elapsedMinutes: settings.watchMinutes,
              suggestedReply: parsed.reply,
              detectedIntent: parsed.intent,
              confidence: parsed.confidence,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ];
        });
      }
    } finally {
      processingRef.current.delete(chatKey);
    }
  }, [settings.watchMinutes]);

  const resetTimer = useCallback((msg: CustomerMessage) => {
    const chatKey = msg.chatId;
    clearTimersForChat(chatKey);
    generatedRef.current.delete(chatKey);

    const timer = setTimeout(() => {
      generateShadowReply(msg);
    }, settings.watchMinutes * 60 * 1000);

    timersRef.current.set(chatKey, timer);
  }, [clearTimersForChat, generateShadowReply, settings.watchMinutes]);

  useEffect(() => {
    if (!settings.enabled) {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
      return;
    }

    const chatIds = new Set(customerMessages.map((m) => m.chatId));

    for (const chatId of timersRef.current.keys()) {
      if (!chatIds.has(chatId)) {
        clearTimersForChat(chatId);
        generatedRef.current.delete(chatId);
        dismissChatAlerts(chatId);
      }
    }

    for (const msg of customerMessages) {
      if (!timersRef.current.has(msg.chatId)) {
        resetTimer(msg);
      }
    }

    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, [customerMessages, settings.enabled, resetTimer, clearTimersForChat, dismissChatAlerts]);

  const handleUserReplied = useCallback((chatId: string) => {
    clearTimersForChat(chatId);
    generatedRef.current.delete(chatId);
    dismissChatAlerts(chatId);
  }, [clearTimersForChat, dismissChatAlerts]);

  const regenerateReply = useCallback(async (alert: ShadowAlert) => {
    generatedRef.current.delete(alert.chatId);
    dismissAlert(alert.id);
    const msg = customerMessages.find((m) => m.chatId === alert.chatId);
    if (msg) {
      await generateShadowReply(msg);
    }
  }, [customerMessages, dismissAlert, generateShadowReply]);

  const sendReply = useCallback((alert: ShadowAlert, editedMessage?: string) => {
    onSendReply?.(alert.chatId, editedMessage ?? alert.suggestedReply);
    clearTimersForChat(alert.chatId);
    generatedRef.current.delete(alert.chatId);
    dismissAlert(alert.id);
  }, [onSendReply, clearTimersForChat, dismissAlert]);

  return {
    alerts,
    settings,
    updateSettings,
    dismissAlert,
    dismissChatAlerts,
    handleUserReplied,
    regenerateReply,
    sendReply,
  };
}
