"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg px-6 text-center">
      <AlertTriangle className="h-12 w-12 text-app-danger" />
      <h1 className="text-lg font-bold text-app-text">오류가 발생했습니다</h1>
      <p className="max-w-sm text-sm text-app-text-muted">
        {error.message || "알 수 없는 오류입니다. 잠시 후 다시 시도해주세요."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-app-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="h-4 w-4" />
        다시 시도
      </button>
    </div>
  );
}
