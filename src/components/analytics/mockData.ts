export interface StatCardData {
  label: string;
  value: string;
  change: number;
  positive: boolean;
}

export interface LineChartPoint {
  date: string;
  발송: number;
  응답: number;
}

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

export interface TopChatRoom {
  rank: number;
  name: string;
  messages: number;
  participants: number;
  change: number;
}

export const STAT_CARDS: StatCardData[] = [
  { label: "총 발송", value: "12,847", change: 12.5, positive: true },
  { label: "응답률", value: "68.3%", change: 5.2, positive: true },
  { label: "활성 채팅방", value: "342", change: 3.1, positive: true },
  { label: "신규 가입자", value: "1,204", change: 2.4, positive: false },
];

export const LINE_CHART_DATA: LineChartPoint[] = [
  { date: "07/16", 발송: 1840, 응답: 1104 },
  { date: "07/17", 발송: 2150, 응답: 1419 },
  { date: "07/18", 발송: 1980, 응답: 1346 },
  { date: "07/19", 발송: 2340, 응답: 1638 },
  { date: "07/20", 발송: 1710, 응답: 1111 },
  { date: "07/21", 발송: 2520, 응답: 1713 },
  { date: "07/22", 발송: 2307, 응답: 1568 },
];

export const DONUT_DATA: DonutSegment[] = [
  { name: "개인", value: 45, color: "#8b5cf6" },
  { name: "그룹", value: 30, color: "#3b82f6" },
  { name: "채널", value: 25, color: "#a855f7" },
];

export const DONUT_TOTAL = 342;

export const TOP_CHAT_ROOMS: TopChatRoom[] = [
  { rank: 1, name: "TeleMon VIP 마케팅", messages: 3847, participants: 1280, change: 18.2 },
  { rank: 2, name: "스타트업 네트워크", messages: 2950, participants: 850, change: 12.7 },
  { rank: 3, name: "크립토 시그널", messages: 2683, participants: 720, change: -3.4 },
  { rank: 4, name: "주식 투자 인사이트", messages: 2401, participants: 640, change: 8.1 },
  { rank: 5, name: "부동산 정보 공유", messages: 1984, participants: 510, change: 15.3 },
];

export type DateRangeKey = "today" | "7days" | "30days" | "thisMonth" | "custom";

export const DATE_RANGE_LABELS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "7days", label: "7일" },
  { key: "30days", label: "30일" },
  { key: "thisMonth", label: "이번 달" },
  { key: "custom", label: "커스텀" },
];
