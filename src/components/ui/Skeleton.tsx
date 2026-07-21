import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "gold-shimmer";
}

export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  if (variant === "gold-shimmer") {
    return (
      <div
        aria-hidden="true"
        className={cn("rounded-lg", className)}
        style={{
          background: `linear-gradient(90deg, var(--color-card) 0%, var(--color-accent-light) 25%, var(--color-card) 50%)`,
          backgroundSize: "200% 100%",
          animation: "gold-shimmer 3s ease-in-out infinite",
        }}
      />
    );
  }
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-app-card-hover", className)} />;
}
