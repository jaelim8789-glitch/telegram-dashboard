import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  // Purely decorative shimmer placeholder — hidden from assistive tech so it
  // isn't announced as empty content. Pages showing multiple Skeletons while
  // loading should own a single aria-live/aria-busy region around the group.
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-app-card-hover", className)} />;
}
