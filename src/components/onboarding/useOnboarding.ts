"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "telemon-onboarding-dismissed";
const ONBOARDING_VERSION = 1;

/** Returns true if the onboarding tour should be shown for this session. */
export function useOnboarding() {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check localStorage – only show if never dismissed and key doesn't exist
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setShow(true);
      } else {
        const parsed = JSON.parse(raw);
        // Only suppress if it matches the current version
        if (parsed?.version === ONBOARDING_VERSION) {
          setShow(false);
        } else {
          setShow(true);
        }
      }
    } catch {
      setShow(true);
    }
    setReady(true);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: ONBOARDING_VERSION, dismissedAt: Date.now() })
      );
    } catch {
      // Storage full or blocked – silently ignore
    }
    setShow(false);
  }, []);

  return { show: ready && show, dismiss, ready };
}