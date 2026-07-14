"use client";

import { useEffect, useState } from "react";

/**
 * Returns a live-updating "time until" string for an ISO 8601 future datetime.
 * Re-renders every 1s while > 1 minute away, then every 1s for detailed display.
 * Returns null when target is null, in the past, or missing.
 */
export function useCountdown(iso: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) {
      setLabel(null);
      return;
    }

    function tick() {
      const now = Date.now();
      const target = new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setLabel(null);
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setLabel(`${days}일 ${hours}시간 후`);
      } else if (hours > 0) {
        setLabel(`${hours}시간 ${minutes}분 후`);
      } else if (minutes > 0) {
        setLabel(`${minutes}분 ${seconds}초 후`);
      } else {
        setLabel(`${seconds}초 후`);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);

  return label;
}

/**
 * Converts recurring interval minutes to a human-readable Korean label.
 */
export function intervalLabel(minutes: number | null): string {
  if (minutes == null) return "";
  if (minutes < 60) return `${minutes}분 간격`;
  const hours = minutes / 60;
  if (hours % 1 === 0) return `${hours}시간 간격`;
  return `${minutes}분 간격`;
}
