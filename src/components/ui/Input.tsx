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
  // 모바일 터치를 위한 추가 속성
  touchTargetSize?: 'default' | 'large';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, inputMode, enterKeyHint, autoCorrect, autoCapitalize, type, touchTargetSize = 'default', ...props }, ref) => {
    const resolvedInputMode = inputMode ??
      (type === "number" || type === "tel" ? "numeric" :
       type === "email" ? "email" :
       type === "url" ? "url" :
       type === "search" ? "search" :
       "text");
    const resolvedEnterKeyHint = enterKeyHint ?? RESOLVE_KEY_HINT[type ?? ""] ?? "done";

    return (
      <input
        ref={ref}
        type={type}
        inputMode={resolvedInputMode}
        enterKeyHint={resolvedEnterKeyHint}
        autoCorrect={autoCorrect ?? (type === "email" || type === "url" ? "off" : undefined)}
        autoCapitalize={autoCapitalize ?? (type === "email" || type === "url" ? "off" : undefined)}
        className={cn(
          "flex h-9 w-full rounded-lg border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-muted outline-none transition-all",
          "border-app-border focus:border-app-primary focus:ring-1 focus:ring-app-primary/30",
          // 터치 타겟 크기 옵션에 따라 높이 조정
          touchTargetSize === 'large' ? 'min-h-[48px] sm:min-h-11 text-base py-3' : 'min-h-[44px] sm:min-h-9',
          error && "border-app-danger focus:border-app-danger focus:ring-app-danger/30",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";