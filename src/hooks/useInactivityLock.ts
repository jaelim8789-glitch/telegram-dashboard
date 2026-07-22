import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useInactivityLock() {
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const resetTimer = () => {
      if (timer.current) clearTimeout(timer.current);
      
      timer.current = setTimeout(() => {
        // 자동 잠금 기능 실행
        useDashboardStore.getState().setLocked(true);
      }, 300000); // 5분 (300,000ms)
    };

    // 모든 이벤트에 대해 타이머 리셋
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // 초기 타이머 설정
    resetTimer();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, []);
}