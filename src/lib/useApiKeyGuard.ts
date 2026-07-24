"use client";

import { useState, useCallback } from "react";
import { getToken } from "@/lib/auth";

const APIKEY_STORAGE_KEY = "telemon_has_api_key";

/** ?재 API ?? ?록?어 ?는지 ?인 */
export function checkHasApiKey(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(APIKEY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** API ???록 ?태????*/
export function markApiKeySet() {
  try {
    localStorage.setItem(APIKEY_STORAGE_KEY, "true");
  } catch (e) { console.warn('Unhandled error in useApiKeyGuard', e) }
}

/** 발송 같? ?료 기능??보호?는 ??*/
export function useApiKeyGuard() {
  const [hasApiKey, setHasApiKey] = useState(checkHasApiKey);
  const [showModal, setShowModal] = useState(false);

  /** ?큰???는지 + API ?? ?정?었?? ?인 */
  const requireApiKey = useCallback((): boolean => {
    const token = getToken();
    if (!token) return false; // 로그??????
    if (!checkHasApiKey()) {
      setShowModal(true);
      return false;
    }
    return true;
  }, []);

  const onKeySet = useCallback(() => {
    markApiKeySet();
    setHasApiKey(true);
    setShowModal(false);
  }, []);

  return { hasApiKey, showModal, setShowModal, requireApiKey, onKeySet };
}