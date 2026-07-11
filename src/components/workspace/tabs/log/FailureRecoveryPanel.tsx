"use client";

import { Ban, RefreshCw, ExternalLink, AlertTriangle, UserX, FileWarning, ServerOff, WifiOff, Clock, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { FailureInfo } from "@/types";

const CATEGORY_META: Record<string, { tone: "danger" | "warning" | "neutral"; icon: typeof AlertTriangle; label: string }> = {
  unauthorized: { tone: "danger", icon: UserX, label: "인증 필요" },
  banned: { tone: "danger", icon: Ban, label: "차단됨" },
  rate_limited: { tone: "warning", icon: Clock, label: "제한됨" },
  invalid_recipient: { tone: "warning", icon: AlertTriangle, label: "수신자 오류" },
  media_error: { tone: "warning", icon: FileWarning, label: "미디어 오류" },
  temporary_network: { tone: "warning", icon: WifiOff, label: "네트워크 오류" },
  configuration: { tone: "danger", icon: ServerOff, label: "설정 오류" },
  timeout: { tone: "warning", icon: Clock, label: "시간 초과" },
  unknown: { tone: "neutral", icon: AlertTriangle, label: "알 수 없음" },
};

const RETRYABILITY_LABEL: Record<string, string> = {
  retryable: "재시도 가능",
  conditional: "조건부 재시도",
  not_retryable: "재시도 불가",
};

const RETRYABILITY_TONE: Record<string, "success" | "warning" | "danger"> = {
  retryable: "success",
  conditional: "warning",
  not_retryable: "danger",
};

interface FailureRecoveryPanelProps {
  failureInfo: FailureInfo;
  errorMessage: string | null;
  accountDead: boolean;
  onRetry: () => void;
  onEditResend: () => void;
  onReauthenticate?: () => void;
  /** Allow caller to suppress inline action buttons when showing in a context
   * (e.g. recurring child log) where only informational display is useful. */
  actions?: "full" | "readonly";
}

export function FailureRecoveryPanel({
  failureInfo,
  errorMessage,
  accountDead,
  onRetry,
  onEditResend,
  onReauthenticate,
  actions = "full",
}: FailureRecoveryPanelProps) {
  const meta = CATEGORY_META[failureInfo.category] ?? CATEGORY_META.unknown;
  const Icon = meta.icon;
  const isRetryable = failureInfo.retryable === "retryable";
  const isConditional = failureInfo.retryable === "conditional";
  const action = failureInfo.recovery_action;
  const readonly = actions === "readonly";

  return (
    <div className={cn(
      "rounded-xl border p-3.5",
      meta.tone === "danger" && "border-app-danger/20 bg-app-danger-muted/10",
      meta.tone === "warning" && "border-app-warning/20 bg-app-warning-muted/10",
      meta.tone === "neutral" && "border-app-border bg-app-card",
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          meta.tone === "danger" && "text-app-danger",
          meta.tone === "warning" && "text-app-warning",
          meta.tone === "neutral" && "text-app-text-muted",
        )} aria-hidden="true" />

        <div className="min-w-0 flex-1 space-y-2">
          {/* Header row: category + retryability */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Badge tone={RETRYABILITY_TONE[failureInfo.retryable]}>
              {RETRYABILITY_LABEL[failureInfo.retryable]}
            </Badge>
          </div>

          {/* Summary */}
          <p className="text-sm text-app-text">{failureInfo.summary}</p>

          {/* Raw error (for debugging context, only when useful) */}
          {errorMessage && errorMessage !== failureInfo.summary && (
            <details className="group">
              <summary className="cursor-pointer text-[11px] text-app-text-subtle hover:text-app-text transition-colors">
                원본 오류 메시지
              </summary>
              <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-app-text-muted">
                {errorMessage}
              </p>
            </details>
          )}

          {/* Account deleted warning */}
          {accountDead && (
            <Badge tone="danger">연결된 계정이 삭제됨</Badge>
          )}

          {/* Recovery actions */}
          {!readonly && !accountDead && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Retry (only when actually retryable) */}
              {(isRetryable || isConditional) && action === "wait_and_retry" && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-3.5 w-3.5" /> 재시도
                </Button>
              )}

              {/* Retry broadcast for timeout/unknown */}
              {(isRetryable || isConditional) && (action === "retry_broadcast") && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-3.5 w-3.5" /> 재시도
                </Button>
              )}

              {/* Re-authenticate */}
              {action === "reauthenticate_account" && onReauthenticate && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={onReauthenticate}>
                    <ExternalLink className="h-3.5 w-3.5" /> 계정 재인증
                  </Button>
                  {isConditional && (
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                      <RefreshCw className="h-3.5 w-3.5" /> 재시도
                    </Button>
                  )}
                </div>
              )}

              {/* Banned — no retry, just explanation */}
              {action === "account_is_banned" && (
                <div className="flex items-center gap-2 text-xs text-app-text-muted">
                  <Ban className="h-3.5 w-3.5 text-app-danger" />
                  <span>재시도해도 차단이 해제되지 않습니다.</span>
                </div>
              )}

              {/* Edit & resend for invalid_recipient, media_error, configuration, timeout */}
              {["check_recipient", "check_media", "check_configuration"].includes(action) && (
                <Button variant="secondary" size="sm" onClick={onEditResend}>
                  <SendHorizonal className="h-3.5 w-3.5" /> 편집 후 재발송
                </Button>
              )}

              {/* Contact support */}
              {action === "contact_support" && (
                <span className="text-xs text-app-text-muted">
                  관리자에게 문의하거나 새 발송을 생성하세요.
                </span>
              )}

              {/* Retry with retry_broadcast for configuration timeout */}
              {action === "retry_broadcast" && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-3.5 w-3.5" /> 재시도
                </Button>
              )}

              {/* always show edit & resend for failed broadcasts */}
              <Button variant="ghost" size="sm" onClick={onEditResend}>
                <SendHorizonal className="h-3.5 w-3.5" /> 편집 후 재발송
              </Button>
            </div>
          )}

          {/* Account deleted — no actions possible */}
          {accountDead && !readonly && (
            <p className="text-xs text-app-text-muted">
              계정이 삭제되어 재발송할 수 없습니다. 새 계정으로 발송해주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
