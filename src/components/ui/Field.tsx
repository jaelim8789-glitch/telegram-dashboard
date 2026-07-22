import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type LabelHTMLAttributes } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

interface FieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  label?: string;
  description?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
  tooltip?: string;
}

export function Field({ label, description, error, htmlFor, children, required, className, tooltip, ...props }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || tooltip) && (
        <div className="flex items-center gap-1.5">
          {label && (
            <label htmlFor={htmlFor} className="block text-sm font-medium text-app-text">
              {label}
              {required && <span className="ml-0.5 text-app-danger">*</span>}
            </label>
          )}
          {tooltip && (
            <div className="group relative">
              <Info className="h-3.5 w-3.5 text-app-text-subtle" />
              <div className="absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg bg-app-surface/90 backdrop-blur-xl p-2 text-xs text-app-text shadow-lg group-hover:block border border-app-border">
                {tooltip}
              </div>
            </div>
          )}
        </div>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-app-text-muted">{description}</p>
      )}
      {error && (
        <p className="text-xs text-app-danger">{error}</p>
      )}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]", // 최소 터치 타겟 크기
        className
      )}
      {...rest}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 appearance-none min-h-[44px]", // 최소 터치 타겟 크기
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[100px] resize-none", // 높이 증가 및 리사이즈 방지
        className
      )}
      {...rest}
    />
  );
}