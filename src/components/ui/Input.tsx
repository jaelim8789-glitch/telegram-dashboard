import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Smart inputMode that auto-detects from type. Pass `inputMode` explicitly to
 * override (e.g. <Input type="text" inputMode="numeric" />). */
function resolveInputMode(
  type?: string,
  explicit?: InputHTMLAttributes<HTMLInputElement>["inputMode"]
): InputHTMLAttributes<HTMLInputElement>["inputMode"] {
  if (explicit !== undefined) return explicit;
  return (
    type === "number" || type === "tel" ? "numeric" :
    type === "email" ? "email" :
    type === "url" ? "url" :
    type === "search" ? "search" :
    "text"
  ) as InputHTMLAttributes<HTMLInputElement>["inputMode"];
}

/** Smart enterKeyHint mapped from type + context. Pass `enterKeyHint` to override. */
function resolveEnterKeyHint(
  type?: string,
  explicit?: HTMLInputElement["enterKeyHint"]
): HTMLInputElement["enterKeyHint"] {
  if (explicit !== undefined) return explicit;
  return (
    type === "search" ? "search" :
    type === "email" ? "send" :
    type === "url" ? "go" :
    "done"
  ) as HTMLInputElement["enterKeyHint"];
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, inputMode, enterKeyHint, autoCorrect, autoCapitalize, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        inputMode={resolveInputMode(type, inputMode)}
        enterKeyHint={resolveEnterKeyHint(type, enterKeyHint)}
        autoCorrect={autoCorrect ?? (type === "email" || type === "url" ? "off" : undefined)}
        autoCapitalize={autoCapitalize ?? (type === "email" || type === "url" ? "off" : undefined)}
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
