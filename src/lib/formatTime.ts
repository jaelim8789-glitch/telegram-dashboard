/**
 * Shared date/time formatting utilities.
 * Consolidated from multiple duplicated implementations across tab components.
 */

export function formatTimestamp(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

export function formatTimestampCompact(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(`${iso}Z`).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function formatDuration(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const diffMs = (end ? new Date(`${end}Z`).getTime() : Date.now()) - new Date(`${start}Z`).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return null;
  if (sec < 60) return `${sec}초`;
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

export function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("ko-KR");
}
