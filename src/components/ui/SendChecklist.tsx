"use client";

import { CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChecklistItem {
  label: string;
  passed: boolean;
  message: string;
}

interface SendChecklistProps {
  hasRecipients: boolean;
  messageLength: number;
  spamScore: number;
  riskLevel: string;
  hasScheduledTime?: boolean;
  className?: string;
}

export function SendChecklist({
  hasRecipients, messageLength, spamScore, riskLevel, hasScheduledTime, className,
}: SendChecklistProps) {
  const items: ChecklistItem[] = [
    { label: "수신자 선택", passed: hasRecipients, message: hasRecipients ? "수신자 선택됨" : "수신자를 선택해주세요" },
    { label: "메시지 입력", passed: messageLength >= 10, message: messageLength >= 10 ? `${messageLength}자 입력됨` : "메시지를 10자 이상 입력해주세요" },
    { label: "스팸 검사", passed: spamScore < 70, message: spamScore < 70 ? `스팸 점수 ${spamScore}/100 (안전)` : `스팸 점수 ${spamScore}/100 — 수정 필요` },
    { label: "리스크 검사", passed: riskLevel !== "danger", message: riskLevel === "danger" ? "발송 리스크 위험" : riskLevel === "safe" ? "리스크 없음" : "주의 필요" },
  ];
  if (hasScheduledTime !== undefined) {
    items.push({ label: "예약 시간", passed: hasScheduledTime, message: hasScheduledTime ? "예약 시간 설정됨" : "예약 시간을 설정해주세요" });
  }

  const passed = items.filter((i) => i.passed).length;
  const total = items.length;

  return (
    <div className={cn("rounded-xl border border-app-border bg-app-card/50 p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-app-text-muted">발송 체크리스트</span>
        <span className={cn("text-[10px] font-semibold", passed === total ? "text-app-success" : "text-app-warning")}>
          {passed}/{total}
        </span>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            {item.passed ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-app-success" />
            ) : (
              <AlertCircle className="h-3 w-3 shrink-0 text-app-text-muted" />
            )}
            <span className={item.passed ? "text-app-text-muted" : "text-app-text"}>{item.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
