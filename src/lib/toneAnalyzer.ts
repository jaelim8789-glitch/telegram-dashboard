export type ToneType = "formal" | "casual" | "urgent" | "friendly" | "aggressive" | "informative";

export interface ToneAnalysis {
  primaryTone: ToneType;
  secondaryTone: ToneType | null;
  scores: Record<ToneType, number>;
  feedback: string[];
}

const FORMAL_KEYWORDS = [
  "안녕하세요", "감사합니다", "수고하십니다", " 문의", "요청", "안내",
  "진행", "검토", "협조", "공지", "드립니다", "입니다", "습니다",
  "귀하", "이용", "관련", "처리", "확인", "부탁",
];

const CASUAL_KEYWORDS = [
  "ㅋㅋ", "ㅎㅎ", "ㄱㅅ", "ㅇㅋ", "ㅠㅠ", "넵", "네엡", "안녕",
  "그래", "응", "야", "헐", "대박", "짱", "존나",
];

const URGENT_KEYWORDS = [
  "긴급", "빨리", "급함", "당장", "지금", "바로", " ASAP", "urgent",
  "마감", "임박", "늦기", "제발", "꼭", "필수",
];

const FRIENDLY_KEYWORDS = [
  "😊", "🙏", "💕", "☺️", "친구", "우리", "같이", "함께",
  "편하게", "언제든", "기다릴게", "축하", "응원",
];

const AGGRESSIVE_KEYWORDS = [
  "당장", "반드시", "무조건", "죄송", "경고", "조치", "책임",
  "강력", "엄중", "항의", "불만", "고소",
];

const INFORMATIVE_KEYWORDS = [
  "안내", "설명", "방법", "절차", "기준", "내용", "정의",
  "기능", "사용", "예시", "참고", "세부", "구성", "단계",
];

export function analyzeTone(message: string): ToneAnalysis {
  const lower = message.toLowerCase();
  const scores: Record<ToneType, number> = {
    formal: 0, casual: 0, urgent: 0, friendly: 0, aggressive: 0, informative: 0,
  };

  const countMatches = (keywords: string[]): number =>
    keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;

  scores.formal = countMatches(FORMAL_KEYWORDS) * 8;
  scores.casual = countMatches(CASUAL_KEYWORDS) * 8;
  scores.urgent = countMatches(URGENT_KEYWORDS) * 10;
  scores.friendly = countMatches(FRIENDLY_KEYWORDS) * 8;
  scores.aggressive = countMatches(AGGRESSIVE_KEYWORDS) * 10;
  scores.informative = countMatches(INFORMATIVE_KEYWORDS) * 7;

  const msgLen = message.length;
  if (msgLen > 200) scores.formal += 10;
  if (msgLen < 30) scores.casual += 5;

  const exclaimCount = (message.match(/!!/g) ?? []).length;
  if (exclaimCount > 0) scores.urgent += exclaimCount * 5;

  const questionCount = (message.match(/\?/g) ?? []).length;
  if (questionCount > 2) scores.friendly += 5;

  const sorted = (Object.entries(scores) as [ToneType, number][]).sort((a, b) => b[1] - a[1]);
  const primaryTone = sorted[0][0];
  const secondaryTone = sorted[1][1] > 0 ? sorted[1][0] : null;

  const feedback: string[] = [];
  if (scores.aggressive > 20) feedback.push("메시지가 다소 공격적으로 느껴질 수 있습니다. 부드러운 표현을 권장합니다.");
  if (scores.formal > 30) feedback.push("격식 있는 어조입니다. 비즈니스 상황에 적합합니다.");
  if (scores.casual > 20) feedback.push("친근한 어조입니다. 지인이나 팀 내 소통에 적합합니다.");
  if (scores.urgent > 20) feedback.push("긴급한 톤이 감지됩니다. 중요 공지에 적합합니다.");
  if (scores.friendly > 15 && scores.aggressive === 0) feedback.push("따뜻하고 친근한 메시지입니다.");
  if (scores.informative > 20) feedback.push("정보 전달형 메시지입니다. 명확하고 이해하기 쉽습니다.");

  return { primaryTone, secondaryTone, scores, feedback };
}

export function toneLabel(tone: ToneType): string {
  const labels: Record<ToneType, string> = {
    formal: "격식", casual: "친근", urgent: "긴급",
    friendly: "따뜻", aggressive: "강경", informative: "정보형",
  };
  return labels[tone];
}

export function toneColor(tone: ToneType): string {
  const colors: Record<ToneType, string> = {
    formal: "text-app-info", casual: "text-app-success",
    urgent: "text-app-danger", friendly: "text-pink-400",
    aggressive: "text-orange-400", informative: "text-cyan-400",
  };
  return colors[tone];
}

export function toneBg(tone: ToneType): string {
  const bg: Record<ToneType, string> = {
    formal: "bg-app-info-muted", casual: "bg-app-success-muted",
    urgent: "bg-app-danger-muted", friendly: "bg-pink-500/10",
    aggressive: "bg-orange-500/10", informative: "bg-cyan-500/10",
  };
  return bg[tone];
}
