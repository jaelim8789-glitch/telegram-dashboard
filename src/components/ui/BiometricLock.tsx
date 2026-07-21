"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Lock, Shield } from "lucide-react";

const STORAGE_KEY = "telemon-biometric-enabled";

interface BiometricLockProps {
  children: ReactNode;
}

export function BiometricLock({ children }: BiometricLockProps) {
  const [locked, setLocked] = useState(true);
  const [supported, setSupported] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const enabled = localStorage.getItem(STORAGE_KEY) === "true";
    if (!enabled) { setLocked(false); return; }
    setSupported(
      typeof window !== "undefined" &&
      "PublicKeyCredential" in window &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    );
  }, []);

  async function authenticate() {
    if (!supported) { setLocked(false); return; }
    setChecking(true);
    setError("");
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        },
      });
      if (credential) setLocked(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("인증이 취소되었습니다");
      } else {
        setError("인증에 실패했습니다");
      }
    } finally {
      setChecking(false);
    }
  }

  async function enableBiometric() {
    setChecking(true);
    setError("");
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "TeleMon", id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: "telemon-user",
            displayName: "TeleMon User",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        },
      });
      if (cred) {
        localStorage.setItem(STORAGE_KEY, "true");
        setLocked(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("설정이 취소되었습니다");
      } else {
        setError("지원되지 않는 기기입니다");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            <div className="max-w-sm w-full mx-6 text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] shadow-2xl shadow-[var(--color-accent-glow)]">
                  <Lock className="h-7 w-7" style={{ color: "var(--color-accent-contrast)" }} />
                </div>
              </div>

              <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                잠금 해제
              </h1>
              <p className="text-sm text-app-text-muted">
                생체 인증으로 TeleMon을 잠금 해제하세요
              </p>

              {error && (
                <p className="text-xs text-app-danger bg-app-danger-muted rounded-lg py-2 px-3">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3">
                {supported ? (
                  <button
                    type="button"
                    onClick={authenticate}
                    disabled={checking}
                    className="btn-luxury btn-luxury-primary justify-center py-3"
                  >
                    <Fingerprint className="h-4 w-4" />
                    {checking ? "인증 중..." : "Touch ID / Face ID"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={enableBiometric}
                    disabled={checking}
                    className="btn-luxury btn-luxury-primary justify-center py-3"
                  >
                    <Shield className="h-4 w-4" />
                    {checking ? "설정 중..." : "생체 인증 설정"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem(STORAGE_KEY); setLocked(false); }}
                  className="text-xs text-app-text-muted hover:text-app-text transition-colors py-2"
                >
                  건너뛰기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!locked && children}
    </>
  );
}
