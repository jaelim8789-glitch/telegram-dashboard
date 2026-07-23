"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-app-danger/20 bg-app-danger-muted/10 p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-app-danger/50" />
          <p className="text-xs text-app-text-muted">이 위젯을 불러오는 중 오류가 발생했습니다</p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> 다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
