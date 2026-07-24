"use client";

import { useState, useCallback } from "react";
import { useToastStore } from "@/components/ui/GlobalToast";

export function useAccountNameTemplate() {
  const toast = useToastStore(s => s.add);
  const [templates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("telemon-account-name-templates") || "[]"); } catch { return []; }
  });

  const applyTemplate = useCallback((template: string, phone: string) => {
    const name = phone.replace(/(\d{3})(\d{4})(\d{4})/, `$1-$2-$3`);
    const result = template.replace("{phone}", name).replace("{last4}", phone.slice(-4));
    return result;
  }, []);

  const saveTemplate = useCallback((t: string) => {
    try { localStorage.setItem("telemon-account-name-templates", JSON.stringify([t])); } catch (e) { console.warn('Unhandled error in useAccountNameTemplate', e) }
    toast({ type: "success", title: "?œí”Œë¦??€?¥ë¨" });
  }, [toast]);

  return { templates, applyTemplate, saveTemplate };
}
