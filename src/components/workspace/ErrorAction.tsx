"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, RefreshCw, Sparkles, UserPlus, ArrowUpCircle } from "lucide-react";
import * as api from "@/lib/api";
import type { AiReplyRequest } from "@/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

interface ErrorActionProps {
  errorMessage: string;
  /** Account ID for reauth / AI rewrite */
  accountId?: string;
  /** Current message text for AI rewrite */
  message?: string;
  /** Called when the message is AI-rewritten */
  onRewrite?: (newMessage: string) => void;
  /** Called when user wants to reauthenticate */
  onReauth?: () => void;
  /** Called when user wants to upgrade plan */
  onUpgrade?: () => void;
  /** Called when user wants to add account */
  onAddAccount?: () => void;
  className?: string;
}

type ActionType = "reauth" | "upgrade" | "addAccount" | "rewrite" | "none";

function classifyError(msg: string): { actionType: ActionType; label: string; description: string } {
  const lower = msg.toLowerCase();

  if (lower.includes("계정 한도") || lower.includes("max_accounts") || lower.includes("account limit")) {
    return {
      actionType: "addAccount",
      label: "계정 추가하기",
      description: "더 많은 계정을 연결하려면 요금제를 업그레이드하세요.",
    };
  }

  if (lower.includes("세션") || lower.includes("expired") || lower.includes("인증") || lower.includes("reauth") || lower.includes("unauthorized") || lower.includes("재인증")) {
    return {
      actionType: "reauth",
      label: "재인증하기",
      description: "텔레그램 세션이 만료되었습니다. 계정을 다시 인증해주세요.",
    };
  }

  if (lower.includes("한도") || lower.includes("limit") || lower.includes("daily") || lower.includes("요금제") || lower.includes("upgrade") || lower.includes("plan") || lower.includes("quota")) {
    return {
      actionType: "upgrade",
      label: "요금제 업그레이드",
      description: "현재 요금제 한도에 도달했습니다. 업그레이드가 필요합니다.",
    };
  }

  if (lower.includes("스팸") || lower.includes("spam") || lower.includes("block")) {
    return {
      actionType: "rewrite",
      label: "AI로 메시지 순화",
      description: "AI가 스팸 점수를 낮추는 방향으로 메시지를 수정합니다.",
    };
  }

  return { actionType: "none", label: "", description: "" };
}

export function ErrorAction({
  errorMessage, accountId, message, onRewrite, onReauth, onUpgrade, onAddAccount, className,
}: ErrorActionProps) {
  const { toast } = useToast();
  const { actionType, label, description } = classifyError(errorMessage);
  const [rewriting, setRewriting] = useState(false);

  if (actionType === "none") return null;

  async function handleAction() {
    switch (actionType) {
      case "reauth":
        onReauth?.();
        break;
      case "upgrade":
        onUpgrade?.();
        break;
      case "addAccount":
        onAddAccount?.();
        break;
      case "rewrite":
        if (!accountId || !message || !onRewrite) return;
        setRewriting(true);
        try {
          const result = await api.requestAiReply({
            accountId,
            message,
            instruction: "스팸 점수를 낮추도록 메시지를 순화해주세요. 광고성 표현을 제거하고 자연스럽게 바꿔주세요.",
          } as AiReplyRequest);
          if (result?.reply) {
            onRewrite(result.reply);
            toast("success", "AI가 메시지를 순화했습니다. 내용을 확인 후 발송하세요.");
          }
        } catch {
          toast("error", "AI 순화에 실패했습니다. 직접 수정해주세요.");
        } finally {
          setRewriting(false);
        }
        break;
    }
  }

  const icons: Record<ActionType, typeof Loader2 | null> = {
    reauth: RefreshCw,
    upgrade: ArrowUpCircle,
    addAccount: UserPlus,
    rewrite: Sparkles,
    none: null,
  };

  const Icon = icons[actionType];

  return (
    <div className={cn("rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2", className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{label}</p>
          <p className="text-[11px] text-app-text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        loading={rewriting}
        onClick={handleAction}
        className="w-full"
      >
        {Icon && !rewriting && <Icon className="h-3.5 w-3.5" />}
        {rewriting ? "순화 중..." : label}
      </Button>
    </div>
  );
}
