import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type EnterKeyHint = InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];

const RESOLVE_KEY_HINT: Record<string, EnterKeyHint> = {
  search: "search",
  email: "send",
  url: "go",
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  autoCorrect?: string;
  autoCapitalize?: string;
  touchTargetSize?: "default" | "large";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      error,
      inputMode,
      enterKeyHint,
      autoCorrect,
      autoCapitalize,
      type,
      touchTargetSize = "default",
      ...props
    },
    ref
  ) => {
    const resolvedInputMode =
      inputMode ??
      (type === "number" || type === "tel"
        ? "numeric"
        : type === "email"
          ? "email"
          : type === "url"
            ? "url"
            : type === "search"
              ? "search"
              : "text");
    const resolvedEnterKeyHint =
      enterKeyHint ?? RESOLVE_KEY_HINT[type ?? ""] ?? "done";

    return (
      <input
        ref={ref}
        type={type}
        inputMode={resolvedInputMode}
        enterKeyHint={resolvedEnterKeyHint}
        autoCorrect={
          autoCorrect ??
          (type === "email" || type === "url" ? "off" : undefined)
        }
        autoCapitalize={
          autoCapitalize ??
          (type === "email" || type === "url" ? "off" : undefined)
        }
        className={cn(
          "flex w-full rounded-[14px] border px-3 py-2 text-sm text-[#e5e5ec] placeholder:text-[#686880] outline-none transition-all duration-200",
          "bg-[rgba(10,10,15,0.88)] backdrop-blur-xl saturate-[1.2]",
          "border-[rgba(139,92,246,0.12)]",
          "focus:border-[rgba(139,92,246,0.50)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.06)]",
          touchTargetSize === "large"
            ? "min-h-[48px] sm:min-h-11 text-base py-3"
            : "min-h-[44px] sm:min-h-12 py-3",
          error &&
            "border-[rgba(239,68,68,0.35)] focus:border-[rgba(239,68,68,0.50)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]",
          className
        )}
        {...(type === "text" ||
        type === "email" ||
        type === "url" ||
        type === "tel" ||
        type === "search"
          ? { "data-mobile-keyboard": "true" }
          : {})}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
