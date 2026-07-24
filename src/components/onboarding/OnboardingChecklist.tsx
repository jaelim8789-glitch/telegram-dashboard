"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, UserPlus, MessageSquare, Send, Users } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAccountCache } from "@/lib/useAccountCache";

const DISMISS_KEY = "telemon-onboarding-checklist-dismissed";
const PROFILE_VISIT_KEY = "telemon-onboarding-profile-visited";
const VERSION = 1;

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
  complete: boolean;
}

export function OnboardingChecklist() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const activeTab = useDashboardStore((s) => s.activeTab);

  const { groups, broadcasts } = useAccountCache(selectedAccountId);

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      return JSON.parse(raw)?.version === VERSION;
    } catch { return false; }
  });

  const [profileVisited, setProfileVisited] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(PROFILE_VISIT_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    if (activeTab === "profile") {
      try { localStorage.setItem(PROFILE_VISIT_KEY, "true"); } catch (e) { console.warn('Unhandled error in OnboardingChecklist', e) }
      setProfileVisited(true);
    }
  }, [activeTab]);

  useEffect(() => {
    function handler(e: StorageEvent) {
      if (e.key === PROFILE_VISIT_KEY && e.newValue === "true") setProfileVisited(true);
    }
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify({ version: VERSION, at: Date.now() })); } catch (e) { console.warn('Unhandled error in OnboardingChecklist', e) }
    setDismissed(true);
  }, []);

  const steps: Step[] = [
    {
      id: "account",
      label: "Í≥ÑÏ†ï ?±Î°ù?òÍ∏∞",
      icon: <UserPlus className="h-4 w-4" />,
      complete: accounts.length > 0,
    },
    {
      id: "group",
      label: "Ï≤?Î≤àÏß∏ ?Ä?îÎ∞© ?∞Îèô",
      icon: <Users className="h-4 w-4" />,
      complete: groups.length > 0,
    },
    {
      id: "send",
      label: "Ï≤?Î©îÏãúÏßÄ Î∞úÏÜ°?òÍ∏∞",
      icon: <Send className="h-4 w-4" />,
      complete: broadcasts.some((b) => b.status === "sent"),
    },
    {
      id: "profile",
      label: "?ÑÎ°ú???§Ï†ï",
      icon: <MessageSquare className="h-4 w-4" />,
      complete: profileVisited,
    },
  ];

  const completeCount = steps.filter((s) => s.complete).length;
  const allComplete = completeCount === steps.length;
  const show = !dismissed && !allComplete && !accountsLoading && accounts.length === 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-4 rounded-xl border border-app-info/20 bg-app-info-muted/10 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-app-text">?úÏûë?òÍ∏∞</span>
              <span className="text-xs text-app-text-muted tabular-nums">{completeCount}/{steps.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-app-text-muted hover:text-app-text px-2 py-0.5 rounded transition-colors"
              >
                ?§Ïãú Î≥¥Ï? ?äÍ∏∞
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="?´Í∏∞"
                className="flex h-6 w-6 items-center justify-center rounded text-app-text-muted hover:bg-app-card-hover transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-border mb-3">
            <motion.div
              className="h-full rounded-full bg-app-info"
              initial={{ width: "0%" }}
              animate={{ width: `${(completeCount / steps.length) * 100}%` }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
          </div>

          <div className="space-y-1.5">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 * i }}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  step.complete ? "text-app-text-subtle" : "text-app-text"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    step.complete
                      ? "bg-app-success text-white"
                      : "bg-app-card-hover text-app-text-muted"
                  }`}
                >
                  {step.complete ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={step.complete ? "line-through" : ""}>{step.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
