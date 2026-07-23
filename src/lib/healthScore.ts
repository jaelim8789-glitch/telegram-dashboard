import type { Account, Broadcast, DeliveryOverview } from "@/types";

export interface AccountHealthScore {
  accountId: string;
  label: string;
  score: number;
  level: "critical" | "warning" | "healthy" | "excellent";
  factors: { label: string; value: number; max: number }[];
}

export function computeHealthScore(
  account: Account,
  overview: DeliveryOverview | null,
  recentLogs: Broadcast[],
): AccountHealthScore {
  const factors: { label: string; value: number; max: number }[] = [];
  let total = 0;
  let maxTotal = 0;

  // 1. 계정 상태 (35점)
  const statusScore: Record<string, number> = { active: 35, inactive: 10, banned: 0, suspended: 5 };
  const sScore = statusScore[account.status] ?? 0;
  factors.push({ label: "계정 상태", value: sScore, max: 35 });
  total += sScore;
  maxTotal += 35;

  // 2. 최근 성공률 (30점)
  const accountLogs = recentLogs.filter((l) => l.accountId === account.id);
  const sent = accountLogs.filter((l) => l.status === "sent").length;
  const failed = accountLogs.filter((l) => l.status === "failed").length;
  const totalAttempts = sent + failed;
  const successRate = totalAttempts > 0 ? sent / totalAttempts : 1;
  const sRateScore = Math.round(successRate * 30);
  factors.push({ label: "최근 성공률", value: sRateScore, max: 30 });
  total += sRateScore;
  maxTotal += 30;

  // 3. 인증 상태 (20점)
  const authScore = account.autoReplyEnabled ? 20 : 10;
  factors.push({ label: "인증/설정", value: authScore, max: 20 });
  total += authScore;
  maxTotal += 20;

  // 4. 발송 활동성 (15점)
  const activityScore = totalAttempts > 0 ? 15 : 5;
  factors.push({ label: "발송 활동", value: activityScore, max: 15 });
  total += activityScore;
  maxTotal += 15;

  const score = Math.round((total / maxTotal) * 100);
  const level = score >= 90 ? "excellent" : score >= 70 ? "healthy" : score >= 40 ? "warning" : "critical";

  return {
    accountId: account.id,
    label: account.name?.trim() || account.phone,
    score,
    level,
    factors,
  };
}

export function computeOverallScore(scores: AccountHealthScore[]): { score: number; level: AccountHealthScore["level"] } {
  if (scores.length === 0) return { score: 0, level: "critical" };
  const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
  const level = avg >= 90 ? "excellent" : avg >= 70 ? "healthy" : avg >= 40 ? "warning" : "critical";
  return { score: avg, level };
}

export function healthScoreColor(level: AccountHealthScore["level"]): string {
  switch (level) {
    case "excellent": return "text-app-success";
    case "healthy": return "text-app-info";
    case "warning": return "text-app-warning";
    case "critical": return "text-app-danger";
  }
}

export function healthScoreBg(level: AccountHealthScore["level"]): string {
  switch (level) {
    case "excellent": return "bg-app-success-muted";
    case "healthy": return "bg-app-info-muted";
    case "warning": return "bg-app-warning-muted";
    case "critical": return "bg-app-danger-muted";
  }
}
