import { SkeletonList } from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-app-text-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-app-primary border-t-transparent" />
          불러오는 중...
        </div>
        <SkeletonList count={3} />
      </div>
    </div>
  );
}
