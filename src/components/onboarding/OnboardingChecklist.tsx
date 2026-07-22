"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAccountCache } from "@/lib/useAccountCache";
import type { Broadcast } from "@/types";

const STORAGE_KEY = "telemon-onboarding-checklist-dismissed";
const CHECKLIST_VERSION = 1;

interface ChecklistStep {
  id: string;
  label: string;
  isComplete: boolean;
}

function hasCompletedBroadcast(broadcasts: Broadcast[]): boolean {
  return broadcasts.some((b) => b.status === "sent");
}

function useProfileVisited(): boolean {
  const [visited, setVisited] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("telemon-onboarding-profile-visited");
      if (raw) {
        setVisited(true);
      }
    } catch {
      /* ignore */
    }

    const handler = () => {
      try {
        const raw = localStorage.getItem("telemon-onboarding-profile-visited");
        if (raw) {
          setVisited(true);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return visited;
}

export function useProfileTracker() {
  const trackProfileVisit = useCallback(() => {
    try {
      localStorage.setItem("telemon-onboarding-profile-visited", "true");
    } catch {
      /* ignore */
    }
  }, []);

  return { trackProfileVisit };
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const { groups, broadcasts } = useAccountCache(selectedAccountId);
  const profileVisited = useProfileVisited();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setDismissed(false);
      } else {
        const parsed = JSON.parse(raw);
        if (parsed?.version !== CHECKLIST_VERSION) {
          setDismissed(false);
        }
      }
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, []);

  const steps: ChecklistStep[] = [
    {
      id: "register-account",
      label: "계정 등록하기",
      isComplete: accounts.length >= 1,
    },
    {
      id: "connect-group",
      label: "첫 번째 대화방 연동하기",
      isComplete: groups.length >= 1,
    },
    {
      id: "send-message",
      label: "첫 메시지 발송하기",
      isComplete: hasCompletedBroadcast(broadcasts),
    },
    {
      id: "setup-profile",
      label: "프로필 설정하기",
      isComplete: profileVisited,
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allComplete = completedCount === totalCount;

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: CHECKLIST_VERSION, dismissedAt: Date.now() })
      );
    } catch {
      /* ignore */
    }
    setExiting(true);
  }, []);

  const dismissPermanently = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (!ready || accountsLoading) return null;
  if (dismissed || exiting || allComplete) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative mx-auto mb-3 w-full max-w-lg overflow-hidden rounded-xl border border-app-border bg-app-card p-4 shadow-md"
      >
        <button
          onClick={dismiss}
          className="absolute right-2.5 top-2.5 rounded-lg p-1 text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-3">
          <p className="text-xs font-semibold text-app-text">
            시작하기 {completedCount}/{totalCount}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-app-card-hover">
            <motion.div
              className="h-full rounded-full bg-app-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            />
          </div>
        </div>

        <ul className="space-y-1.5">
          {steps.map((step, index) => (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.1 + index * 0.06 }}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
                step.isComplete
                  ? "text-app-text-muted"
                  : "text-app-text"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  step.isComplete
                    ? "bg-app-success text-white"
                    : "bg-app-card-hover text-app-text-muted"
                )}
              >
                {step.isComplete ? (
                  <Check className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </span>
              <span className={step.isComplete ? "line-through opacity-60" : ""}>
                {step.label}
              </span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-end border-t border-app-border pt-2.5">
          <button
            onClick={dismissPermanently}
            className="rounded-lg px-2.5 py-1 text-[10px] text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
          >
            다시 보지 않기
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
