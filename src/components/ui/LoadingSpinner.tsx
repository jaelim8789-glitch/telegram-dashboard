import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";
import { HTMLAttributes } from "react";

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  message, 
  fullScreen = false,
  className,
  ...props 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const spinner = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      fullScreen && "fixed inset-0 z-50 bg-app-bg/80 backdrop-blur-sm",
      className
    )} {...props}>
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-app-primary")} />
      {message && (
        <p className="text-sm text-app-text-muted font-medium">{message}</p>
      )}
    </div>
  );

  return spinner;
}