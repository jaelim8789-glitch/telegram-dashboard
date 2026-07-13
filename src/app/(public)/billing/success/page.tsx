"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

type VerificationState = "verifying" | "verified" | "failed" | "pending";

export default function BillingSuccessPage() {
  const [state, setState] = useState<VerificationState>("verifying");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const ref = params.get("payment_ref");
    setSessionId(sid);

    if (!ref) {
      // No payment_ref — show failed; direct navigation without valid ref is blocked
      setState("failed");
      setErrorMsg("유효하지 않은 접근입니다. payment_ref가 누락되었습니다.");
      return;
    }

    let cancelled = false;

    async function verifyPayment() {
      try {
        // Use the public /api/payment/status/{payment_ref} endpoint —
        // it is intentionally public and is the trusted backend source of truth
        // for payment completion state (same endpoint used by get-api-key polling).
        const statusRes = await fetch(`${SITE.api}/api/payment/status/${ref}`);

        if (!cancelled) {
          if (statusRes.ok) {
            const data = await statusRes.json();
            if (data.status === "completed") {
              setState("verified");
            } else if (data.status === "pending") {
              setState("pending");
            } else {
              setState("failed");
              setErrorMsg("결제가 확인되지 않았습니다. 다시 시도해주세요.");
            }
          } else {
            setState("failed");
            setErrorMsg("결제 상태를 확인할 수 없습니다. 고객지원으로 문의해주세요.");
          }
        }
      } catch {
        if (!cancelled) {
          setState("failed");
          setErrorMsg("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
      }
    }

    verifyPayment();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-app-bg px-4 py-20">
      <div className="mx-auto max-w-lg text-center">
        {state === "verifying" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-primary/20 animate-pulse">
              <svg className="h-10 w-10 text-app-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-bold text-app-text">결제 확인 중...</h1>
            <p className="mt-4 text-lg text-app-text-secondary">
              결제 상태를 확인하고 있습니다. 잠시만 기다려주세요.
            </p>
          </>
        )}

        {state === "verified" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="mt-6 text-3xl font-bold text-app-text">결제 완료! 🎉</h1>
            <p className="mt-4 text-lg text-app-text-secondary">
              요금제가 성공적으로 활성화되었습니다. 이제 모든 프리미엄 기능을 이용하실 수 있습니다.
            </p>

            {sessionId && (
              <p className="mt-4 text-xs text-app-text-secondary">
                세션 ID: {sessionId}
              </p>
            )}

            <div className="mt-8 space-y-4">
              <Link href={`${SITE.app}/app`}>
                <Button variant="primary" className="w-full h-12 text-base font-semibold">
                  대시보드로 이동
                </Button>
              </Link>
              <Link href="/features" className="block text-sm text-app-text-secondary hover:text-app-text">
                프리미엄 기능 살펴보기
              </Link>
            </div>
          </>
        )}

        {state === "pending" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
              <svg className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="mt-6 text-3xl font-bold text-app-text">결제 확인 대기 중</h1>
            <p className="mt-4 text-lg text-app-text-secondary">
              결제가 아직 확인되지 않았습니다. 잠시 후 다시 방문해주세요.
            </p>

            <div className="mt-8 space-y-4">
              <Link href="/pricing">
                <Button variant="primary" className="w-full h-12 text-base font-semibold">
                  요금제 다시 확인
                </Button>
              </Link>
              <Link href={`${SITE.app}/app`} className="block text-sm text-app-text-secondary hover:text-app-text">
                대시보드로 이동
              </Link>
            </div>
          </>
        )}

        {state === "failed" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h1 className="mt-6 text-3xl font-bold text-app-text">결제 확인 실패</h1>
            {errorMsg && (
              <p className="mt-4 text-base text-red-400">{errorMsg}</p>
            )}
            <p className="mt-2 text-sm text-app-text-secondary">
              결제가 완료되지 않았거나 유효하지 않은 접근입니다.
            </p>

            <div className="mt-8 space-y-4">
              <Link href="/pricing">
                <Button variant="primary" className="w-full h-12 text-base font-semibold">
                  요금제 다시 시도
                </Button>
              </Link>
              <a
                href="mailto:support@telemon.io"
                className="block text-sm text-app-text-secondary hover:text-app-text"
              >
                고객지원 문의
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}