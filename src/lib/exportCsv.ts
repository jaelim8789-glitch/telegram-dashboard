import type { Broadcast } from "@/types";

/**
 * Convert an array of Broadcast records to a CSV string and trigger a browser
 * download.
 */
export function downloadLogsCsv(logs: Broadcast[], filename = "telemon-logs.csv"): void {
  if (logs.length === 0) return;

  const headers = [
    "ID",
    "계정 ID",
    "메시지",
    "상태",
    "수신자 수",
    "예약 시간",
    "발송 시간",
    "생성 시간",
    "에러 메시지",
    "반복 간격(분)",
    "취소 시간",
    "다음 발송 시간",
  ];

  const rows = logs.map((log) => [
    escapeCsvField(log.id),
    escapeCsvField(log.accountId),
    escapeCsvField(log.message),
    escapeCsvField(log.status),
    String(log.recipients.length),
    escapeCsvField(log.scheduledAt ?? ""),
    escapeCsvField(log.sentAt ?? ""),
    escapeCsvField(log.createdAt),
    escapeCsvField(log.errorMessage ?? ""),
    log.recurringIntervalMinutes != null ? String(log.recurringIntervalMinutes) : "",
    escapeCsvField(log.cancelledAt ?? ""),
    escapeCsvField(log.nextScheduledAt ?? ""),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // BOM for Excel compatibility with Korean characters
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape a CSV field: wrap in double quotes if it contains commas, quotes, or
 * newlines, and escape any embedded double quotes.
 */
function escapeCsvField(value: string): string {
  if (!value) return '""';
  // Normalize newlines for a single-line CSV cell
  const cleaned = value.replace(/\n/g, " ").replace(/\r/g, " ");
  if (cleaned.includes(",") || cleaned.includes('"') || cleaned.includes("\n")) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  return `"${cleaned}"`;
}