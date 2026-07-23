"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Auto night mode — 일몰 시간 감지 → 자동 다크모드 전환
 */
export function useAutoNightMode(): boolean {
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    function check() {
      const hour = new Date().getHours();
      const night = hour < 6 || hour >= 19;
      setIsNight(night);
      document.documentElement.setAttribute("data-auto-night", String(night));
    }
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  return isNight;
}
