"use client";

interface RelativeTimeOptions { future?: boolean; short?: boolean; }

export function relativeTime(dateStr: string | Date, options: RelativeTimeOptions = {}): string {
  const date = typeof dateStr === "string" ? new Date(dateStr + "Z") : dateStr;
  const diff = Date.now() - date.getTime();
  const abs = Math.abs(diff);
  const sec = Math.floor(abs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 10) return "방금";
  if (sec < 60) return `${sec}초 전`;
  if (min < 60) return `${min}분 전`;
  if (hr < 24) return `${hr}시간 전`;
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function relativeTimeFull(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr + "Z") : dateStr;
  const rel = relativeTime(dateStr);
  const full = date.toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return `${rel} (${full})`;
}
