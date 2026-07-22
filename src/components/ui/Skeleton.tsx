import { memo } from "react";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "gold-shimmer";
  width?: string | number;
  height?: string | number;
}

export const Skeleton = memo(function Skeleton({ className, variant = "default", width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width != null) style.width = typeof width === "number" ? `${width}px` : width;
  if (height != null) style.height = typeof height === "number" ? `${height}px` : height;

  if (variant === "gold-shimmer") {
    return (
      <div
        aria-hidden="true"
        className={cn("rounded-lg", className)}
        style={{
          ...style,
          background: `linear-gradient(90deg, var(--color-card) 0%, var(--color-accent-light) 25%, var(--color-card) 50%)`,
          backgroundSize: "200% 100%",
          animation: "gold-shimmer 3s ease-in-out infinite",
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-app-card-hover", className)}
      style={style}
    />
  );
});
