"use client";

import Link from "next/link";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-app-bg leather-bg">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-glass-bg)] backdrop-blur-2xl border-b border-[var(--color-accent-border)] satin-overlay">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] text-xs font-bold tracking-wider shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[var(--color-accent-glow)]">
              TM
            </div>
            <span className="text-base font-semibold heritage-heading">
              Tele<span className="text-[var(--color-accent)]">Mon</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pt-24">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger)]/10">
            <svg className="h-8 w-8 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="section-heading text-2xl text-app-text">페이지를 불러올 수 없습니다</h1>
          <p className="editorial-body text-sm text-app-text-muted">
            {process.env.NODE_ENV === "development"
              ? error.message
              : "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={reset} className="btn-heritage">
              다시 시도
            </button>
            <Link href="/" className="btn-heritage-secondary">
              홈으로
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--color-accent-border)] bg-[var(--color-bg-surface)] relative z-10 leather-bg">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
          <p className="text-center text-[11px] text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} TeleMon
          </p>
        </div>
      </footer>
    </div>
  );
}
