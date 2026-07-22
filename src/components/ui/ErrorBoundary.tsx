import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('에러 발생:', error, errorInfo);
    // 에러 리포팅 로직을 여기에 추가할 수 있음
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-app-danger-muted p-4 rounded-full mb-4">
            <RefreshCw className="h-8 w-8 text-app-danger" />
          </div>
          <h2 className="text-xl font-bold text-app-text mb-2">문제가 발생했습니다</h2>
          <p className="text-app-text-muted mb-4">
            문제가 지속된다면 고객센터에 문의해주세요
          </p>
          <details className="text-sm text-app-text-subtle mb-4 w-full max-w-md">
            <summary>에러 상세 정보</summary>
            <p className="mt-2 p-2 bg-app-bg rounded text-left">
              {this.state.error?.toString()}
            </p>
          </details>
          <Button 
            variant="primary" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;