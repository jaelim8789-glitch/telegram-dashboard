import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-muted outline-none transition-all",
          "border-app-border focus:border-app-primary focus:ring-1 focus:ring-app-primary/30",
          "min-h-[44px] sm:min-h-9",
          error && "border-app-danger focus:border-app-danger focus:ring-app-danger/30",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
