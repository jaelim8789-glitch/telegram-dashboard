export interface ViralScoreResult { score: number; label: string; color: string; level: "low" | "medium" | "high" | "critical"; recommendations: string[]; }

export function computeViralScore(message: string): ViralScoreResult {
  const score = Math.min(100, Math.floor((message.match(/[!?]{2,}/g)?.length ?? 0) * 15 + (message.match(/https?:\/\//g)?.length ?? 0) * 10));
  return {
    score,
    label: score > 70 ? "높음" : score > 40 ? "중간" : "낮음",
    color: score > 70 ? "text-red-500" : score > 40 ? "text-amber-500" : "text-green-500",
    level: score > 70 ? "critical" : score > 40 ? "high" : "low",
    recommendations: score > 50 ? ["URL 수가 많습니다", "특수문자 반복 사용을 줄이세요"] : [],
  };
}

export function viralColor(score: number): string {
  return score > 70 ? "text-red-500" : score > 40 ? "text-amber-500" : "text-green-500";
}

export function viralBg(score: number): string {
  return score > 70 ? "bg-red-100" : score > 40 ? "bg-amber-100" : "bg-green-100";
}

export function viralLabel(score: number): string {
  return score > 70 ? "높음" : score > 40 ? "중간" : "낮음";
}
