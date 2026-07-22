"use client";
import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-12 text-app-text-muted">
          <p className="text-sm font-medium">오류가 발생했습니다</p>
          <p className="text-xs mt-1">페이지를 새로고침해주세요</p>
        </div>
      );
    }
    return this.props.children;
  }
}
