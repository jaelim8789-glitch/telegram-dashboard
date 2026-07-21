import type { Account, Broadcast, Group } from "@/types";

export type RiskLevel = "safe" | "caution" | "danger";

export interface RiskAnalysis {
  level: RiskLevel;
  score: number;
  reasons: string[];
  recommendations: string[];
}

export function analyzeSendRisk(
  account: Account | null,
  targetGroups: Group[],
  recentLogs: Broadcast[],
  message: string,
): RiskAnalysis {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let penalty = 0;

  if (!account) {
    reasons.push("선택된 계정 없음");
    recommendations.push("발송할 계정을 먼저 선택하세요");
    return { level: "danger", score: 0, reasons, recommendations };
  }

  if (account.status !== "active") {
    reasons.push(`계정 상태: ${account.status}`);
    recommendations.push("계정을 활성화 또는 재인증하세요");
    penalty += 40;
  }

  const accountLogs = recentLogs.filter((l) => l.accountId === account.id && l.status === "failed");
  if (accountLogs.length > 5) {
    reasons.push(`최근 실패 ${accountLogs.length}건`);
    recommendations.push("과거 실패 원인을 먼저 확인하세요");
    penalty += 20;
  } else if (accountLogs.length > 0) {
    reasons.push(`최근 실패 ${accountLogs.length}건`);
    penalty += 10;
  }

  if (targetGroups.length === 0) {
    reasons.push("수신 그룹 미선택");
    recommendations.push("발송할 그룹을 선택하세요");
    penalty += 30;
  }

  if (targetGroups.length > 20) {
    reasons.push(`대상 그룹 ${targetGroups.length}개 (대량)`);
    recommendations.push("20개 이상 그룹 동시 발송은 제한될 수 있습니다");
    penalty += 10;
  }

  if (!message.trim()) {
    reasons.push("메시지 내용 없음");
    recommendations.push("발송할 메시지를 입력하세요");
    penalty += 25;
  }

  if (message.length > 4000) {
    reasons.push("메시지가 4000자를 초과");
    penalty += 5;
  }

  const score = Math.max(0, 100 - penalty);
  const level: RiskLevel = score >= 80 ? "safe" : score >= 50 ? "caution" : "danger";

  return { level, score, reasons, recommendations };
}

export function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "safe": return "text-app-success";
    case "caution": return "text-app-warning";
    case "danger": return "text-app-danger";
  }
}

export function riskLevelBg(level: RiskLevel): string {
  switch (level) {
    case "safe": return "bg-app-success-muted";
    case "caution": return "bg-app-warning-muted";
    case "danger": return "bg-app-danger-muted";
  }
}

export function riskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case "safe": return "안전";
    case "caution": return "주의";
    case "danger": return "위험";
  }
}

export function riskLevelIcon(level: RiskLevel): string {
  switch (level) {
    case "safe": return "✅";
    case "caution": return "⚠️";
    case "danger": return "🚫";
  }
}
