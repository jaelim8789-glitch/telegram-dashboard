"use client";

/**
 * App Icon Badge — 진행 중/실패 발송 건수를 앱 아이콘에 뱃지 표시
 */
export function setAppBadge(count: number) {
  if ("setAppBadge" in navigator) {
    (navigator as any).setAppBadge(count).catch(() => {});
  }
}

export function clearAppBadge() {
  if ("clearAppBadge" in navigator) {
    (navigator as any).clearAppBadge().catch(() => {});
  }
}

/** Update badge from broadcast stats */
export function updateBadgeFromStats(stats: { pending: number; failed: number; sent: number; total: number }) {
  const critical = stats.pending + stats.failed;
  if (critical > 0) {
    setAppBadge(critical);
  } else if (stats.sent > 0) {
    setAppBadge(stats.sent);
  } else {
    clearAppBadge();
  }
}
