"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "telemon-onboarding-dismissed";
const ONBOARDING_VERSION = 1;

/**
 * Returns true if the onboarding tour should be shown for this session.
 *
 * `hasAccounts` gates the tour on real account state, not just the
 * localStorage flag — a returning operator who already registered accounts
 * is not a first-time visitor, even in a browser/profile that has never
 * stored the dismissal flag (fresh browser, incognito, cleared storage).
 * Without this, the tour's full-viewport backdrop (z-[100], click-to-dismiss)
 * re-appears and silently swallows the first click anywhere on the page —
 * including workspace tab buttons underneath it — which reads to the user
 * as "the tab doesn't respond to clicks."
 */
export function useOnboarding(hasAccounts = false, accountsLoading = false) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (accountsLoading) {
      setShow(false);
      setReady(true);
      return;
    }
    if (hasAccounts) {
      setShow(false);
      setReady(true);
      return;
    }
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
  }, [accountsLoading, hasAccounts]);

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
