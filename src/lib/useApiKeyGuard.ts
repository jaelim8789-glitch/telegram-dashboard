"use client";

import { useState, useCallback } from "react";
import { getToken } from "@/lib/auth";

const APIKEY_STORAGE_KEY = "telemon_has_api_key";

/** ?„ìž¬ API ?¤ê? ?±ë¡?˜ì–´ ?ˆëŠ”ì§€ ?•ì¸ */
export function checkHasApiKey(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(APIKEY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** API ???±ë¡ ?íƒœë¥??€??*/
export function markApiKeySet() {
  try {
    localStorage.setItem(APIKEY_STORAGE_KEY, "true");
  } catch (e) { console.warn('Unhandled error in useApiKeyGuard', e) }
}

/** ë°œì†¡ ê°™ì? ? ë£Œ ê¸°ëŠ¥??ë³´í˜¸?˜ëŠ” ??*/
export function useApiKeyGuard() {
  const [hasApiKey, setHasApiKey] = useState(checkHasApiKey);
  const [showModal, setShowModal] = useState(false);

  /** ? í°???ˆëŠ”ì§€ + API ?¤ê? ?¤ì •?˜ì—ˆ?”ì? ?•ì¸ */
  const requireApiKey = useCallback((): boolean => {
    const token = getToken();
    if (!token) return false; // ë¡œê·¸??????
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