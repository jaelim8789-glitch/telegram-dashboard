"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function useSuccessPredictor(text: string) {
  const prediction = useMemo(() => {
    let score = 50;
    const reasons: string[] = [];
    const suggestions: string[] = [];

    if (!text.trim()) return { score: 0, label: "메시지를 입력하세요", color: "text-app-text-muted" };

    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) { score -= 20; reasons.push("URL 3개 이상"); suggestions.push("URL은 2개 이하로 줄이세요"); }
    if (urlCount > 0 && urlCount <= 3) { score -= 5; }

    const emojiCount = (text.match(/[\u{1F600}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 5) { score -= 10; reasons.push("이모지 과다"); suggestions.push("이모지는 5개 이내로"); }

    const len = text.length;
    if (len < 10) { score -= 15; reasons.push("메시지가 너무 짧음"); suggestions.push("10자 이상 작성하세요"); }
    if (len > 2000) { score -= 10; reasons.push("메시지가 너무 김"); }

    const capsRatio = text.split("").filter(c => c >= "A" && c <= "Z").length / Math.max(text.length, 1);
    if (capsRatio > 0.4) { score -= 10; reasons.push("대문자 비율 과다"); suggestions.push("대문자 사용을 줄이세요"); }

    const banned = ["무료", "광고", "선착순", "특가", "할인", "대출", "수익", "로또", "복권", "(광고)"];
    const hits = banned.filter(kw => text.includes(kw));
    if (hits.length > 0) { score -= hits.length * 5; reasons.push(`광고 키워드: ${hits.join(", ")}`); suggestions.push("광고성 단어를 제거하세요"); }

    const finalScore = Math.max(5, Math.min(99, score));
    return {
      score: finalScore,
      label: finalScore >= 70 ? "양호" : finalScore >= 40 ? "주의" : "위험",
      color: finalScore >= 70 ? "text-emerald-500" : finalScore >= 40 ? "text-amber-500" : "text-red-500",
      reasons, suggestions,
    };
  }, [text]);

  return prediction;
}

export function SuccessPredictorBadge({ text }: { text: string }) {
  const pred = useSuccessPredictor(text);
  if (!text.trim() || pred.score === 0) return null;

  const Icon = pred.score >= 50 ? TrendingUp : TrendingDown;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${pred.color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{pred.label}</span>
      <span className="opacity-60">({pred.score}%)</span>
    </div>
  );
}
