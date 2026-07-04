import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-app-text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-app-text-subtle">{hint}</span>}
    </label>
  );
}

const inputStyle = cn(
  "w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text",
  "placeholder:text-app-text-subtle outline-none transition-colors duration-150",
  "focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
);

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputStyle, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputStyle, "resize-none", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputStyle, props.className)} />;
}
