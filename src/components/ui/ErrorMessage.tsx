import { AlertCircle, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  showNetworkStatus?: boolean;
}

export function ErrorMessage({ 
  message, 
  onRetry, 
  retryLabel = "다시 시도", 
  className,
  showNetworkStatus = false
}: ErrorMessageProps) {
  // 에러 메시지 유형에 따라 사용자 친화적인 설명 제공
  const getUserFriendlyMessage = () => {
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return {
        title: "네트워크 연결 문제",
        description: "인터넷 연결 상태를 확인하고 다시 시도해주세요."
      };
    } else if (message.toLowerCase().includes('timeout')) {
      return {
        title: "요청 시간 초과",
        description: "서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
      };
    } else if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('unauthorized')) {
      return {
        title: "인증 오류",
        description: "로그인이 만료되었을 수 있습니다. 앱을 새로고침하거나 다시 로그인해주세요."
      };
    } else if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('limit')) {
      return {
        title: "사용량 한도 도달",
        description: "일일 사용량 한도에 도달했습니다. 내일 다시 이용 가능합니다."
      };
    } else {
      return {
        title: "문제가 발생했습니다",
        description: message || "문제가 발생했습니다. 다시 시도해주세요."
      };
    }
  };

  const friendlyMessage = getUserFriendlyMessage();

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-xl px-4 py-6 text-center",
      "bg-app-card border border-app-border",
      className
    )}>
      <div className="flex flex-col items-center gap-2">
        <AlertCircle className="h-8 w-8 text-app-danger" />
        <h3 
          className="font-semibold text-app-text"
          style={{ color: "var(--tg-theme-destructive-text-color, #ec3942)" }}
        >
          {friendlyMessage.title}
        </h3>
        <p className="text-sm text-app-text-muted max-w-xs">
          {friendlyMessage.description}
        </p>
        
        {showNetworkStatus && (
          <div className="flex items-center gap-1.5 text-xs text-app-text-muted">
            {navigator.onLine ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-500" />
                <span>온라인 상태</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                <span>오프라인 상태</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--tg-theme-button-color,#5288c1)] px-4 py-2 text-sm font-medium text-white active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}