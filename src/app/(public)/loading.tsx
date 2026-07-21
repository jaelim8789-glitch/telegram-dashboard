export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        불러오는 중...
      </div>
    </div>
  );
}
