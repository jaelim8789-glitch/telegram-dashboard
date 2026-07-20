"use client";

import { useState, useCallback } from "react";
import { getToken } from "@/lib/auth";

const APIKEY_STORAGE_KEY = "telemon_has_api_key";

/** 현재 API 키가 등록되어 있는지 확인 */
export function checkHasApiKey(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(APIKEY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** API 키 등록 상태를 저장 */
export function markApiKeySet() {
  try {
    localStorage.setItem(APIKEY_STORAGE_KEY, "true");
  } catch {}
}

/** 발송 같은 유료 기능을 보호하는 훅 */
export function useApiKeyGuard() {
  const [hasApiKey, setHasApiKey] = useState(checkHasApiKey);
  const [showModal, setShowModal] = useState(false);

  /** 토큰이 있는지 + API 키가 설정되었는지 확인 */
  const requireApiKey = useCallback((): boolean => {
    const token = getToken();
    if (!token) return false; // 로그인 안 됨
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