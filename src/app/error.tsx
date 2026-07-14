"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger)]/10">
          <svg className="h-8 w-8 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">예기치 않은 오류가 발생했습니다</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {process.env.NODE_ENV === "development"
            ? error.message
            : "서비스 이용 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg)] transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
