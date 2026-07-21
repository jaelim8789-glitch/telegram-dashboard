const BANNED_KEYWORDS = [
  "무료수신", "광고", "선착순", "특가", "할인", "이벤트", "쿠폰", "증정",
  "당첨", "무료", "100%", "확인", "클릭", "지금", "바로", "필독",
  "대출", "투자", "수익", "로또", "복권", "적립", "캐시백", "리워드",
  "선물", "초대합니다", "(광고)", "⏰", "🔥", "💰", "🎁", "📢",
];

const SPAM_URL_PATTERNS = [
  /bit\.ly\//i, /tinyurl\.com\//i, /goo\.gl\//i, /shorturl\.at\//i,
  /kakao\.(com|me|story)/i, /open\.kakao/i, /t\.me\/(joinchat|addstickers)/i,
];

export interface SpamScoreResult {
  score: number;
  level: "safe" | "suspicious" | "danger";
  reasons: string[];
  suggestions: string[];
}

export function computeSpamScore(message: string): SpamScoreResult {
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  if (!message.trim()) {
    return { score: 0, level: "safe", reasons: [], suggestions: [] };
  }

  const lower = message.toLowerCase();

  const keywordHits = BANNED_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));
  if (keywordHits.length > 0) {
    penalty += keywordHits.length * 8;
    reasons.push(`광고 키워드 ${keywordHits.length}개 감지 (${keywordHits.slice(0, 3).join(", ")}${keywordHits.length > 3 ? "..." : ""})`);
    suggestions.push("광고성 단어를 제거하거나 순화하세요");
  }

  const urlMatches = message.match(/https?:\/\/[^\s]+/gi);
  const urlCount = urlMatches?.length ?? 0;
  if (urlCount > 2) {
    penalty += Math.min(urlCount * 10, 30);
    reasons.push(`URL ${urlCount}개 포함 (많음)`);
    suggestions.push("URL은 최대 2개 이하로 줄이세요");
  } else if (urlCount > 0) {
    penalty += urlCount * 3;
  }

  const spamUrlHits = SPAM_URL_PATTERNS.filter((p) => p.test(message));
  if (spamUrlHits.length > 0) {
    penalty += 25;
    reasons.push("단축 URL 또는 초대 링크 감지");
    suggestions.push("단축 URL 대신 정식 도메인을 사용하세요");
  }

  const emojiMatches = message.match(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu);
  const emojiCount = emojiMatches?.length ?? 0;
  if (emojiCount > 5) {
    penalty += Math.min(emojiCount * 3, 20);
    reasons.push(`이모지 ${emojiCount}개 (과다)`);
    suggestions.push("이모지는 5개 이내로 사용하세요");
  }

  const capsRatio = message.replace(/[^A-Za-z가-힣]/g, "").length > 0
    ? message.split("").filter((c) => c >= "A" && c <= "Z").length / message.replace(/[^A-Za-z가-힣]/g, "").length
    : 0;
  if (capsRatio > 0.5 && message.length > 20) {
    penalty += 15;
    reasons.push("대문자 비율 과다 (50% 이상)");
    suggestions.push("대문자 사용을 줄이세요");
  }

  const exclamationCount = (message.match(/!/g) ?? []).length;
  if (exclamationCount > 3) {
    penalty += 5;
    reasons.push("느낌표 과다 사용");
  }

  const repeatPattern = /(.)\1{4,}/;
  if (repeatPattern.test(message)) {
    penalty += 8;
    reasons.push("문자 반복 패턴 감지");
    suggestions.push("반복 문자를 줄이세요");
  }

  const pricePattern = /[\d,]+(?:원|￦|\$|€|£)/;
  if (pricePattern.test(message)) {
    penalty += 10;
    reasons.push("금액 표시 감지");
    suggestions.push("금액을 직접 언급하지 않는 것이 좋습니다");
  }

  const score = Math.max(0, 100 - penalty);
  const level = score >= 80 ? "safe" : score >= 50 ? "suspicious" : "danger";

  return { score, level, reasons, suggestions };
}
