"use client";

import { useState, useEffect } from "react";

const PLACEHOLDERS = [
  "할인 프로모션 메시지를 작성해보세요...",
  "새로운 공지사항을 전달해보세요...",
  "이벤트 초대 메시지를 보내보세요...",
  "AI에게 도움을 요청해보세요...",
  "단순한 인사말도 좋습니다...",
];

/**
 * Placeholder cycling — 입력창 포커스 시 힌트 문구 변화
 */
export function usePlaceholderCycle(active = false, interval = 3000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % PLACEHOLDERS.length), interval);
    return () => clearInterval(t);
  }, [active, interval]);

  return PLACEHOLDERS[index];
}
