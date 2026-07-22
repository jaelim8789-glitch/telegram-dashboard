import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "accent";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const variantClasses = {
  primary: "animate-spin text-app-primary",
  secondary: "animate-spin text-app-text-muted",
  accent: "animate-spin text-[var(--tg-theme-button-color,#5288c1)]",
};

export function LoadingSpinner({ 
  size = "md", 
  label, 
  className, 
  variant = "primary" 
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          "animate-spin",
          className
        )} 
      />
      {label && (
        <span 
          className={cn(
            "text-sm",
            variant === "primary" && "text-app-primary",
            variant === "secondary" && "text-app-text-muted",
            variant === "accent" && "text-[var(--tg-theme-button-color,#5288c1)]"
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}