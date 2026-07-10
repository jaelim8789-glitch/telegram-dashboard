"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BillingSuccessPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id"));
  }, []);

  return (
    <div className="min-h-screen bg-app-bg px-4 py-20">
      <div className="mx-auto max-w-lg text-center">
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
          <Link
            href="/admin/login"
            className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-base font-semibold text-white"
          >
            대시보드로 이동
          </Link>
          <Link href="/features" className="block text-sm text-app-text-secondary hover:text-app-text">
            프리미엄 기능 살펴보기
          </Link>
        </div>
      </div>
    </div>
  );
}
