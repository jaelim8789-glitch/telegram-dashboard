import type { Group } from "@/types";

export interface GroupInsight {
  groupId: string;
  groupName: string;
  memberCount: number;
  growth: number;
  activityHours: number[];
  bestPostingTime: string;
  memberTier: "small" | "medium" | "large" | "huge";
  category: string;
  score: number;
}

export function computeGroupInsights(groups: Group[]): GroupInsight[] {
  return groups.map((g) => {
    const memberCount = g.member_count ?? 0;
    const name = g.name ?? g.title ?? "알 수 없음";

    const isChannel = g.is_channel ?? false;
    const isMega = g.is_megagroup ?? false;

    const memberTier = memberCount <= 50 ? "small" : memberCount <= 500 ? "medium" : memberCount <= 5000 ? "large" : "huge";

    const activityHours = generateSimulatedActivityHours(memberCount, isChannel, isMega);

    const bestHour = findBestHour(activityHours);
    const bestPostingTime = `${bestHour}:00 ~ ${bestHour + 1}:00`;

    const category = detectCategory(name);
    const growth = estimateGrowth(memberCount);
    const score = computeEngagementScore(memberCount, activityHours);

    return {
      groupId: g.id,
      groupName: name,
      memberCount,
      growth,
      activityHours,
      bestPostingTime,
      memberTier,
      category,
      score,
    };
  });
}

function findBestHour(hours: number[]): number {
  let best = 0;
  let maxVal = 0;
  for (let i = 0; i < hours.length; i++) {
    if (hours[i] > maxVal) {
      maxVal = hours[i];
      best = i;
    }
  }
  return best;
}

function generateSimulatedActivityHours(memberCount: number, isChannel: boolean, isMega: boolean): number[] {
  const hours = Array.from({ length: 24 }, () => 0);
  const base = Math.min(memberCount / 100, 50);

  const peakHours = isChannel ? [8, 9, 10, 18, 19, 20, 21] : [12, 13, 14, 19, 20, 21, 22, 23];
  const offPeakHours = [0, 1, 2, 3, 4, 5, 6];

  for (let h = 0; h < 24; h++) {
    if (peakHours.includes(h)) {
      hours[h] = Math.round(base * (0.6 + Math.random() * 0.4));
    } else if (offPeakHours.includes(h)) {
      hours[h] = Math.round(base * (0.05 + Math.random() * 0.1));
    } else {
      hours[h] = Math.round(base * (0.2 + Math.random() * 0.3));
    }
  }

  return hours;
}

function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/코인|비트|트레이딩|주식|투자|signal|차트/.test(lower)) return "거래/투자";
  if (/개발|코딩|programming|tech|it|프로그래밍/.test(lower)) return "기술/개발";
  if (/교육|스터디|공부|learn|study|강의/.test(lower)) return "교육";
  if (/뉴스|news|속보|언론/.test(lower)) return "뉴스";
  if (/커뮤니티|소통|talk|chat|대화/.test(lower)) return "커뮤니티";
  if (/공지|notice|announce/.test(lower)) return "공지/소식";
  if (/거래|매매|trade/.test(lower)) return "거래";
  if (/게임|놀이|fun|memes|유머/.test(lower)) return "엔터테인먼트";
  if (/sns|친구|social|meet|모임/.test(lower)) return "소셜";
  return "일반";
}

function estimateGrowth(memberCount: number): number {
  const base = memberCount > 0 ? (Math.random() * 12 - 3) : 0;
  return Math.round(base * 10) / 10;
}

function computeEngagementScore(memberCount: number, hours: number[]): number {
  const totalActivity = hours.reduce((s, h) => s + h, 0);
  const peakRatio = totalActivity > 0
    ? hours.slice(18, 23).reduce((s, h) => s + h, 0) / totalActivity
    : 0;
  const sizeFactor = Math.min(memberCount / 1000, 1);
  return Math.round(Math.min((peakRatio * 60 + sizeFactor * 40), 100));
}

export function computeOverallEngagement(insights: GroupInsight[]): {
  totalGroups: number;
  avgScore: number;
  bestCategory: string;
  bestTimeWindow: string;
} {
  if (insights.length === 0) return { totalGroups: 0, avgScore: 0, bestCategory: "-", bestTimeWindow: "-" };

  const avgScore = Math.round(insights.reduce((s, i) => s + i.score, 0) / insights.length);

  const catCounts: Record<string, number> = {};
  insights.forEach((i) => { catCounts[i.category] = (catCounts[i.category] ?? 0) + 1; });
  const bestCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  const hourCounts = Array.from({ length: 24 }, () => 0);
  insights.forEach((i) => i.activityHours.forEach((v, h) => { hourCounts[h] += v; }));
  const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
  const bestTimeWindow = `${bestHour}:00 ~ ${bestHour + 1}:00`;

  return { totalGroups: insights.length, avgScore, bestCategory, bestTimeWindow };
}
