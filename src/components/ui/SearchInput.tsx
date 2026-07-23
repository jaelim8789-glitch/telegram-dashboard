import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle"
      />
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-app-border bg-app-card py-2 pl-8 pr-3 text-sm text-app-text",
          "placeholder:text-app-text-subtle outline-none transition-colors duration-150",
          "focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-app-card-hover",
          className
        )}
      />
    </div>
  );
}
