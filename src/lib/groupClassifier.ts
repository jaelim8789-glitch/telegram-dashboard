import type { Group } from "@/types";

export type GroupCategory =
  | "community"
  | "announcement"
  | "support"
  | "trading"
  | "social"
  | "education"
  | "tech"
  | "entertainment"
  | "news"
  | "unknown";

export interface ClassifiedGroup {
  group: Group;
  category: GroupCategory;
  confidence: number;
  tags: string[];
  memberTier: "small" | "medium" | "large" | "huge";
  activityLevel: "low" | "medium" | "high";
}

const CATEGORY_KEYWORDS: Record<GroupCategory, string[]> = {
  community: ["커뮤니티", "소통", "talk", "chat", "대화", "친목", "오픈채팅"],
  announcement: ["공지", "notice", "announcement", "업데이트"],
  support: ["고객", "문의", "support", "help", "cs", "1:1", "상담", "도움"],
  trading: ["거래", "매매", "트레이딩", "차트", "코인", "주식", "선물", "비트코인", "trade", "signal", "투자"],
  social: ["sns", "친구", "지인", "meet", "모임", "동호회", "소모임"],
  education: ["교육", "스터디", "공부", "learn", "study", "강의", "클래스", "학습"],
  tech: ["개발", "programming", "tech", "코딩", "개발자", "developer", "it", "프로그래밍"],
  entertainment: ["연예", "entertainment", "fun", "memes", "밈", "유머", "웃긴", "게임", "놀이"],
  news: ["뉴스", "news", "속보", "언론", "기사"],
  unknown: [],
};

function countKeywordMatches(name: string, keywords: string[]): number {
  const lower = name.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

function estimateMemberTier(memberCount: number): ClassifiedGroup["memberTier"] {
  if (memberCount <= 50) return "small";
  if (memberCount <= 500) return "medium";
  if (memberCount <= 5000) return "large";
  return "huge";
}

function estimateActivityLevel(memberCount: number): ClassifiedGroup["activityLevel"] {
  if (memberCount <= 20) return "low";
  if (memberCount <= 200) return "medium";
  return "high";
}

export function classifyGroup(group: Group): ClassifiedGroup {
  const name = group.title ?? "";

  let bestCategory: GroupCategory = "unknown";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [GroupCategory, string[]][]) {
    if (cat === "unknown") continue;
    const score = countKeywordMatches(name, keywords) * 10;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  const tags: string[] = [];
  if (group.type === "channel") tags.push("채널");
  else if (group.type === "megagroup") tags.push("슈퍼그룹");
  else tags.push("일반그룹");

  if (group.participantsCount != null) {
    tags.push(`멤버 ${group.participantsCount}`);
    if (group.participantsCount > 1000) tags.push("대규모");
    else if (group.participantsCount > 100) tags.push("중규모");
    else tags.push("소규모");
  }

  if (bestCategory !== "unknown") {
    const catLabel: Record<GroupCategory, string> = {
      community: "커뮤니티", announcement: "공지/소식", support: "고객지원",
      trading: "거래/투자", social: "소셜", education: "교육",
      tech: "기술/개발", entertainment: "엔터테인먼트", news: "뉴스", unknown: "기타",
    };
    tags.push(catLabel[bestCategory]);
  }

  return {
    group,
    category: bestCategory,
    confidence: bestScore > 0 ? Math.min(bestScore + 30, 95) : 20,
    tags,
    memberTier: estimateMemberTier(group.participantsCount ?? 0),
    activityLevel: estimateActivityLevel(group.participantsCount ?? 0),
  };
}

export function classifyGroups(groups: Group[]): ClassifiedGroup[] {
  return groups.map(classifyGroup);
}

export function categoryLabel(cat: GroupCategory): string {
  const labels: Record<GroupCategory, string> = {
    community: "커뮤니티", announcement: "공지/소식", support: "고객지원",
    trading: "거래/투자", social: "소셜", education: "교육",
    tech: "기술/개발", entertainment: "엔터테인먼트", news: "뉴스", unknown: "기타",
  };
  return labels[cat];
}

export function categoryColor(cat: GroupCategory): string {
  const colors: Record<GroupCategory, string> = {
    community: "text-blue-400", announcement: "text-purple-400",
    support: "text-emerald-400", trading: "text-amber-400",
    social: "text-pink-400", education: "text-cyan-400",
    tech: "text-indigo-400", entertainment: "text-orange-400",
    news: "text-red-400", unknown: "text-gray-400",
  };
  return colors[cat];
}

export function categoryBg(cat: GroupCategory): string {
  const bg: Record<GroupCategory, string> = {
    community: "bg-blue-500/10", announcement: "bg-purple-500/10",
    support: "bg-emerald-500/10", trading: "bg-amber-500/10",
    social: "bg-pink-500/10", education: "bg-cyan-500/10",
    tech: "bg-indigo-500/10", entertainment: "bg-orange-500/10",
    news: "bg-red-500/10", unknown: "bg-gray-500/10",
  };
  return bg[cat];
}
