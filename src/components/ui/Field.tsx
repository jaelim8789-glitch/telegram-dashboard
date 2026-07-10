import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
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
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-app-text-muted">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-[11px] text-app-danger">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1 block text-[11px] text-app-text-subtle">{hint}</span>
      )}
    </label>
  );
}

function inputStyle(invalid?: boolean) {
  return cn(
    "w-full rounded-xl border bg-app-card px-3 py-2 text-sm text-app-text",
    "placeholder:text-app-text-subtle outline-none transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-app-card-hover",
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
}

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & InputExtraProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputStyle(invalid), className)}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & InputExtraProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputStyle(invalid), "resize-none", className)}
    />
  );
}

export function Select({
  invalid,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & InputExtraProps) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputStyle(invalid), className)}
    />
  );
}
