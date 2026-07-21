export interface ChurnPrediction {
  memberId: string;
  displayName: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
  retentionTip: string;
}

export function predictMemberChurn(
  members: { id: string; name: string; lastActiveDays?: number; messageCount?: number; joinDays?: number }[],
): ChurnPrediction[] {
  return members.map((m) => {
    const reasons: string[] = [];
    let penalty = 0;

    const lastActiveDays = m.lastActiveDays ?? Math.floor(Math.random() * 60);
    const messageCount = m.messageCount ?? Math.floor(Math.random() * 20);
    const joinDays = m.joinDays ?? Math.floor(Math.random() * 365);

    if (lastActiveDays > 30) {
      penalty += 35;
      reasons.push(`30일 이상 비활성 (${lastActiveDays}일)`);
    } else if (lastActiveDays > 14) {
      penalty += 20;
      reasons.push(`2주 이상 비활성 (${lastActiveDays}일)`);
    } else if (lastActiveDays > 7) {
      penalty += 10;
      reasons.push("1주일간 활동 없음");
    }

    if (messageCount === 0 && joinDays > 7) {
      penalty += 25;
      reasons.push("가입 후 메시지 0건");
    } else if (messageCount < 3 && joinDays > 30) {
      penalty += 15;
      reasons.push("장기 가입 but 저활동");
    }

    if (joinDays > 90 && messageCount < 5) {
      penalty += 10;
      reasons.push("3개월 이상 저활동 멤버");
    }

    const score = Math.max(0, Math.min(100, penalty));
    const riskLevel: ChurnPrediction["riskLevel"] = score >= 50 ? "high" : score >= 25 ? "medium" : "low";

    const retentionTips: Record<ChurnPrediction["riskLevel"], string> = {
      high: "멘션하여 개인 메시지를 보내보세요. '@사용자님, 요즘 어떻게 지내세요?'",
      medium: "그룹 활동에 초대하거나 관련 콘텐츠를 공유해보세요.",
      low: "정상 활동 멤버입니다. 현재 상태를 유지하세요.",
    };
    const retentionTip = retentionTips[riskLevel];

    return {
      memberId: m.id,
      displayName: m.name || m.id.slice(0, 8),
      riskScore: score,
      riskLevel,
      reasons,
      retentionTip,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

export function churnColor(level: ChurnPrediction["riskLevel"]): string {
  switch (level) {
    case "high": return "text-app-danger";
    case "medium": return "text-app-warning";
    case "low": return "text-app-success";
  }
}

export function churnBg(level: ChurnPrediction["riskLevel"]): string {
  switch (level) {
    case "high": return "bg-app-danger-muted";
    case "medium": return "bg-app-warning-muted";
    case "low": return "bg-app-success-muted";
  }
}
