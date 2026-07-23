export const SYSTEM_VARIABLES = [
  { key: "today_date", label: "오늘 날짜", example: "2026-07-21", description: "현재 날짜 (YYYY-MM-DD)" },
  { key: "today_date_kr", label: "오늘 날짜(한글)", example: "2026년 7월 21일", description: "한글 형식 날짜" },
  { key: "time", label: "현재 시간", example: "14:30", description: "현재 시간 (HH:mm)" },
  { key: "datetime", label: "날짜+시간", example: "2026-07-21 14:30", description: "날짜와 시간" },
  { key: "day_of_week", label: "요일", example: "화요일", description: "오늘 요일" },
  { key: "recipient_name", label: "수신자 이름", example: "홍길동", description: "그룹/채널 이름 (전송 시 자동 치환)" },
  { key: "random", label: "랜덤 숫자", example: "42", description: "1-100 사이 랜덤 정수" },
  { key: "random_token", label: "랜덤 토큰", example: "a7x9k2", description: "6자리 랜덤 영문+숫자" },
  { key: "sender_name", label: "발신자 이름", example: "TeleMon", description: "계정 이름" },
  { key: "time_remaining", label: "남은 시간", example: "3일 12시간", description: "오늘 자정까지 남은 시간" },
  { key: "week_number", label: "주차", example: "29주차", description: "올해 몇 번째 주" },
  { key: "season", label: "계절", example: "여름", description: "현재 계절" },
];

export function resolveSystemVariables(
  text: string,
  overrides?: Record<string, string>
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const seasons = ["봄", "여름", "가을", "겨울"];
  const month = now.getMonth() + 1;
  const seasonIdx = month >= 3 && month <= 5 ? 0 : month >= 6 && month <= 8 ? 1 : month >= 9 && month <= 11 ? 2 : 3;

  const vars: Record<string, string> = {
    today_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    today_date_kr: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    datetime: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    day_of_week: days[now.getDay()],
    random: String(Math.floor(Math.random() * 100) + 1),
    random_token: Math.random().toString(36).slice(2, 8),
    sender_name: "TeleMon",
    time_remaining: (() => {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return `${h}시간 ${m}분`;
    })(),
    week_number: `${Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)}주차`,
    season: seasons[seasonIdx],
    ...overrides,
  };

  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in vars) return vars[key];
    return match;
  });
}

export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}
