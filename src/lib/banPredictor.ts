import type { Account, Broadcast, AccountHealthItem } from "@/types";

export interface BanPrediction {
  accountId: string;
  label: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: string[];
  recommendations: string[];
  estimatedDaysLeft: number | null;
}

export function predictBanRisk(
  account: Account,
  recentLogs: Broadcast[],
  healthItem: AccountHealthItem | null,
): BanPrediction {
  const factors: string[] = [];
  const recommendations: string[] = [];
  let penalty = 0;

  const accountLogs = recentLogs.filter((l) => l.accountId === account.id);
  const totalSent = accountLogs.filter((l) => l.status === "sent").length;
  const totalFailed = accountLogs.filter((l) => l.status === "failed").length;
  const totalAttempts = totalSent + totalFailed;

  if (account.status === "banned") {
    const pred: BanPrediction = {
      accountId: account.id,
      label: account.name?.trim() || account.phone,
      riskScore: 100,
      riskLevel: "critical",
      factors: ["계정이 이미 차단됨"],
      recommendations: ["차단 해제 절차를 진행하세요", "백업 계정으로 전환하세요"],
      estimatedDaysLeft: 0,
    };
    return pred;
  }

  if (account.status === "inactive") {
    penalty += 20;
    factors.push("계정 비활성 상태");
    recommendations.push("계정을 활성화하세요");
  }

  if (totalAttempts > 0) {
    const failRate = totalFailed / totalAttempts;
    if (failRate > 0.3) {
      penalty += 25;
      factors.push(`실패율 ${(failRate * 100).toFixed(0)}% (높음)`);
      recommendations.push("발송 속도를 줄이고 대상 품질을 확인하세요");
    } else if (failRate > 0.15) {
      penalty += 10;
      factors.push(`실패율 ${(failRate * 100).toFixed(0)}%`);
    }
  }

  if (totalSent > 200) {
    penalty += 15;
    factors.push(`단기 발송량 ${totalSent}건 (과다)`);
    recommendations.push("발송 간격을 늘리고 하루 발송량을 제한하세요");
  } else if (totalSent > 100) {
    penalty += 5;
    factors.push("발송량 증가 추세");
  }

  const recentFailed = accountLogs.filter((l) => l.status === "failed" && l.failureInfo?.category);
  const rateLimitHits = recentFailed.filter((l) =>
    l.failureInfo?.category?.toLowerCase().includes("flood") ||
    l.failureInfo?.category?.toLowerCase().includes("rate") ||
    l.errorMessage?.toLowerCase().includes("flood")
  ).length;
  if (rateLimitHits > 0) {
    penalty += rateLimitHits * 10;
    factors.push(`Flood wait ${rateLimitHits}회 발생`);
    recommendations.push("발송 간격을 늘리세요 (Flood wait은 차단 전조 증상입니다)");
  }

  const recentActivity = accountLogs.filter((l) => {
    const age = Date.now() - new Date(`${l.createdAt}Z`).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  }).length;
  if (recentActivity === 0 && totalAttempts > 0) {
    penalty += 10;
    factors.push("최근 7일간 활동 없음");
    recommendations.push("계정 상태를 확인하세요");
  }

  if (healthItem?.status === "rate_limited") {
    penalty += 15;
    factors.push("레이트 리밋 상태");
  }

  if (healthItem?.status === "unauthorized") {
    penalty += 20;
    factors.push("인증 만료");
    recommendations.push("세션을 갱신하세요");
  }

  const recent24h = accountLogs.filter((l) => {
    const age = Date.now() - new Date(`${l.createdAt}Z`).getTime();
    return age < 24 * 60 * 60 * 1000;
  }).length;
  if (recent24h > 50) {
    penalty += 10;
    factors.push("24시간 내 발송량 과다");
  }

  const score = Math.max(0, Math.min(100, penalty));
  let riskLevel: BanPrediction["riskLevel"];
  let estimatedDaysLeft: number | null;

  if (score >= 80) {
    riskLevel = "critical";
    estimatedDaysLeft = Math.max(1, Math.round(Math.random() * 3 + 1));
  } else if (score >= 50) {
    riskLevel = "high";
    estimatedDaysLeft = Math.max(3, Math.round(Math.random() * 7 + 3));
  } else if (score >= 25) {
    riskLevel = "medium";
    estimatedDaysLeft = null;
  } else {
    riskLevel = "low";
    estimatedDaysLeft = null;
  }

  return {
    accountId: account.id,
    label: account.name?.trim() || account.phone,
    riskScore: score,
    riskLevel,
    factors,
    recommendations,
    estimatedDaysLeft,
  };
}

export function banRiskColor(level: BanPrediction["riskLevel"]): string {
  switch (level) {
    case "critical": return "text-app-danger";
    case "high": return "text-orange-400";
    case "medium": return "text-app-warning";
    case "low": return "text-app-success";
  }
}

export function banRiskBg(level: BanPrediction["riskLevel"]): string {
  switch (level) {
    case "critical": return "bg-app-danger-muted";
    case "high": return "bg-orange-500/10";
    case "medium": return "bg-app-warning-muted";
    case "low": return "bg-app-success-muted";
  }
}

export function banRiskLabel(level: BanPrediction["riskLevel"]): string {
  switch (level) {
    case "critical": return "위험";
    case "high": return "주의";
    case "medium": return "관찰";
    case "low": return "안전";
  }
}
