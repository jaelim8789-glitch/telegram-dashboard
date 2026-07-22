import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  hint?: string;
  /** Validation error message. Takes visual priority over `hint` when both are
   * present, and is announced to screen readers via role="alert". Pair with
   * `invalid` on the paired Input/Textarea/Select for the matching border
   * treatment and aria-invalid. */
  error?: string;
  children: ReactNode;
  // 모바일 터치를 위한 여백 조정
  touchOptimized?: boolean;
}

export function Field({ label, hint, error, children, touchOptimized = false }: FieldProps) {
  return (
    <label className={cn("block", touchOptimized && "py-1.5")}>
      <span className={cn("mb-1.5 block text-xs font-medium text-app-text-muted", touchOptimized && "text-sm")}>{label}</span>
      {children}
      {error ? (
        <span role="alert" className={cn("mt-1 block text-xs text-app-danger", touchOptimized && "text-sm mt-2")}>
          {error}
        </span>
      ) : (
        hint && <span className={cn("mt-1 block text-xs text-app-text-subtle", touchOptimized && "text-sm mt-2")}>{hint}</span>
      )}
    </label>
  );
}

function inputStyle(invalid?: boolean, touchTargetSize?: 'default' | 'large') {
  return cn(
    "w-full rounded-xl border bg-app-card px-3 py-2 text-sm text-app-text",
    "placeholder:text-app-text-subtle outline-none transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-app-card-hover",
    // 터치 타겟 크기 옵션에 따라 높이 조정
    touchTargetSize === 'large' ? 'min-h-[48px] py-3 text-base' : 'min-h-[44px]',
    invalid
      ? "border-app-danger/60 focus:border-app-danger focus:ring-2 focus:ring-app-danger/15"
      : "border-app-border focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
  );
}

interface InputExtraProps {
  /** Marks the field as failing validation: swaps to the danger border/ring
   * and sets aria-invalid. Purely visual/a11y — validation logic stays with
   * the caller. Defaults to false, so existing call sites are unaffected. */
  invalid?: boolean;
  // 모바일 터치를 위한 추가 속성
  touchTargetSize?: 'default' | 'large';
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & InputExtraProps>(
  function Input({ invalid, className, touchTargetSize, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        aria-invalid={invalid || undefined}
        className={cn(inputStyle(invalid, touchTargetSize), className)}
      />
    );
  }
);

export function Textarea({
  invalid,
  className,
  touchTargetSize,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & InputExtraProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputStyle(invalid, touchTargetSize), "resize-none", className)}
    />
  );
}

export function Select({
  invalid,
  className,
  touchTargetSize,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & InputExtraProps) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputStyle(invalid, touchTargetSize), className)}
    />
  );
}