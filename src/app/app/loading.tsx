export default function AppLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-app-bg">
      <div className="flex items-center gap-2 text-sm text-app-text-muted">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-app-primary border-t-transparent" />
        불러오는 중...
      </div>
    </div>
  );
}
