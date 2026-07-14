export default function PublicLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-app-bg leather-bg">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-glass-bg)] backdrop-blur-2xl border-b border-[var(--color-accent-border)] satin-overlay">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-[var(--color-accent)]/30 animate-pulse" />
            <div className="h-4 w-24 rounded bg-[var(--color-text)]/10 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pt-24">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          불러오는 중...
        </div>
      </main>
    </div>
  );
}
