import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/* ── Core Card surface ── */

interface CardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  selected?: boolean;
  interactive?: boolean;
}

export function Card({ children, selected, interactive = true, className, ...props }: CardProps) {
  const base = cn(
    "rounded-[24px] border p-4 text-left transition-all duration-200",
    "bg-[rgba(10,10,15,0.75)] backdrop-blur-xl saturate-[1.2]",
    "shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(139,92,246,0.04)]",
    "hover:shadow-[0_12px_40px_rgba(139,92,246,0.08),inset_0_0_0_1px_rgba(139,92,246,0.08)]",
    selected
      ? "border-[rgba(139,92,246,0.40)] shadow-[0_0_24px_rgba(139,92,246,0.10),inset_0_0_0_1px_rgba(139,92,246,0.12)]"
      : "border-[rgba(139,92,246,0.12)] hover:border-[rgba(139,92,246,0.30)]",
    className
  );

  if (!interactive) {
    return <div className={base}>{children}</div>;
  }

  return (
    <button type="button" className={cn(base, "focus-ring active:scale-[0.99]")} {...props}>
      {children}
    </button>
  );
}

/* ── Card sub-components ── */

function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 pb-3", className)} {...props}>{children}</div>;
}

function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-[#e5e5ec] tracking-tight", className)} {...props}>{children}</h3>;
}

function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[#686880]", className)} {...props}>{children}</p>;
}

function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props}>{children}</div>;
}

function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center pt-4 border-t border-[rgba(139,92,246,0.08)]", className)} {...props}>{children}</div>;
}

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
