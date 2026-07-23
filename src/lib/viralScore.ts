export interface ViralScoreResult {
  score: number;
  level: "low" | "medium" | "high";
  factors: { label: string; value: number; max: number }[];
  recommendations: string[];
}

export function computeViralScore(message: string): ViralScoreResult {
  const factors: { label: string; value: number; max: number }[] = [];
  const recommendations: string[] = [];
  let total = 0;
  let maxTotal = 0;

  if (!message.trim()) {
    return { score: 0, level: "low", factors: [], recommendations: ["메시지를 입력하세요"] };
  }

  // 1. Call to action (25점)
  const ctaKeywords = ["클릭", "참여", "공유", "신청", "지금", "확인", "바로", "함께", "응모", "초대"];
  const ctaHits = ctaKeywords.filter((kw) => message.toLowerCase().includes(kw));
  const ctaScore = Math.min(ctaHits.length * 8, 25);
  factors.push({ label: "행동 유도", value: ctaScore, max: 25 });
  total += ctaScore;
  maxTotal += 25;

  // 2. 감정적 연결 (20점)
  const emotionWords = ["축하", "감사", "사랑", "응원", "대박", "최고", "고마워", "자랑", "기쁨", "행복", "😊", "🎉", "💕", "🔥"];
  const emotionHits = emotionWords.filter((kw) => message.toLowerCase().includes(kw.toLowerCase()));
  const emotionScore = Math.min(emotionHits.length * 5, 20);
  factors.push({ label: "감정적 연결", value: emotionScore, max: 20 });
  total += emotionScore;
  maxTotal += 20;

  // 3. 질문형 (15점)
  const qCount = (message.match(/\?/g) ?? []).length;
  const questionScore = Math.min(qCount * 5, 15);
  factors.push({ label: "질문/호기심 유발", value: questionScore, max: 15 });
  total += questionScore;
  maxTotal += 15;

  // 4. 정보 가치 (15점)
  const infoWords = ["방법", "팁", "노하우", "꿀팁", "정보", "결과", "통계", "데이터", "연구", "사례"];
  const infoHits = infoWords.filter((kw) => message.toLowerCase().includes(kw));
  const infoScore = Math.min(infoHits.length * 5, 15);
  factors.push({ label: "정보 가치", value: infoScore, max: 15 });
  total += infoScore;
  maxTotal += 15;

  // 5. 메시지 길이 (10점)
  const len = message.length;
  const lenScore = len >= 50 && len <= 500 ? 10 : len >= 20 ? 5 : 0;
  factors.push({ label: "적정 길이", value: lenScore, max: 10 });
  total += lenScore;
  maxTotal += 10;

  // 6. URL 포함 (10점)
  const urlCount = (message.match(/https?:\/\/[^\s]+/g) ?? []).length;
  const urlScore = urlCount === 1 ? 10 : urlCount > 0 ? 5 : 0;
  factors.push({ label: "참고 링크", value: urlScore, max: 10 });
  total += urlScore;
  maxTotal += 10;

  // 7. 이모지 적절성 (5점)
  const emojiCount = (message.match(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) ?? []).length;
  const emojiScore = emojiCount >= 1 && emojiCount <= 3 ? 5 : emojiCount > 0 ? 2 : 0;
  factors.push({ label: "이모지 활용", value: emojiScore, max: 5 });
  total += emojiScore;
  maxTotal += 5;

  const score = Math.round((total / maxTotal) * 100);
  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  if (level === "low") {
    recommendations.push("행동을 유도하는 문구를 추가하세요 (예: '지금 확인해보세요')");
    recommendations.push("감정을 자극하는 단어나 이모지를 활용하세요");
    if (qCount === 0) recommendations.push("질문 형태로 작성하면 참여율이 높아집니다");
  } else if (level === "medium") {
    recommendations.push("공유를 유도하는 문장을 추가하면 전파력이 높아집니다");
    recommendations.push("구체적인 데이터나 사례를 포함해 보세요");
  } else {
    recommendations.push("전파력이 높은 메시지입니다! 지금 발송하세요");
  }

  return { score, level, factors, recommendations };
}

export function viralColor(level: ViralScoreResult["level"]): string {
  switch (level) {
    case "high": return "text-app-success";
    case "medium": return "text-app-warning";
    case "low": return "text-app-text-muted";
  }
}

export function viralBg(level: ViralScoreResult["level"]): string {
  switch (level) {
    case "high": return "bg-app-success-muted";
    case "medium": return "bg-app-warning-muted";
    case "low": return "bg-app-card";
  }
}

export function viralLabel(level: ViralScoreResult["level"]): string {
  switch (level) {
    case "high": return "높음";
    case "medium": return "보통";
    case "low": return "낮음";
  }
}
