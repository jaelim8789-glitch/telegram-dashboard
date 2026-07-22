import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'bar' | 'dots';
  message?: string;
  className?: string;
  children?: React.ReactNode;
}

export function LoadingIndicator({
  isLoading = true,
  size = 'md',
  variant = 'spinner',
  message,
  className,
  children
}: LoadingIndicatorProps) {
  if (!isLoading) {
    return children ? <>{children}</> : null;
  }

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const spinner = (
    <Loader2 className={cn(sizeClasses[size], 'animate-spin text-app-text-muted', className)} />
  );

  const bar = (
    <div className={cn('w-full bg-app-border rounded-full overflow-hidden', className)}>
      <div className="h-1.5 bg-app-primary animate-pulse rounded-full"></div>
    </div>
  );

  const dots = (
    <div className={cn('flex space-x-1 items-center', className)}>
      <div className={cn('h-2 w-2 rounded-full bg-app-text-muted animate-bounce', sizeClasses.sm.replace('h-4 w-4', 'h-2 w-2'))}></div>
      <div className={cn('h-2 w-2 rounded-full bg-app-text-muted animate-bounce', sizeClasses.sm.replace('h-4 w-4', 'h-2 w-2'), 'delay-75')}></div>
      <div className={cn('h-2 w-2 rounded-full bg-app-text-muted animate-bounce', sizeClasses.sm.replace('h-4 w-4', 'h-2 w-2'), 'delay-150')}></div>
    </div>
  );

  const loaderMap = {
    spinner,
    bar,
    dots
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {loaderMap[variant]}
      {message && <span className="text-sm text-app-text-muted">{message}</span>}
    </div>
  );
}