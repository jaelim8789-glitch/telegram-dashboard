"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-danger)]/10">
          <svg className="h-7 w-7 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-app-text">관리자 페이지 오류</h1>
        <p className="text-sm text-app-text-muted">
          {process.env.NODE_ENV === "development"
            ? error.message
            : "페이지를 불러오는 중 문제가 발생했습니다."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl bg-app-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-app-primary/20 transition-all duration-150 hover:bg-app-primary-hover active:scale-[0.98]"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
