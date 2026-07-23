"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  tabName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[TabErrorBoundary${this.props.tabName ? ` - ${this.props.tabName}` : ""}]`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-app-danger/20 bg-app-danger-muted/10 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-danger/10">
            <AlertTriangle className="h-6 w-6 text-app-danger" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-app-text">
              {this.props.tabName ? `"${this.props.tabName}" 탭에 오류가 발생했습니다` : "탭 오류"}
            </h3>
            <p className="mt-1 text-xs text-app-text-muted">
              {this.state.error?.message ?? "알 수 없는 오류입니다. 다시 시도해주세요."}
            </p>
          </div>
          <Button variant="primary" onClick={this.handleRetry} className="min-h-[44px]">
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
