"use client";

import { useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useEmptyStateCTA() {
  const setActiveTab = useDashboardStore(s => s.setActiveTab);

  const getEmptyState = useCallback((context: "accounts" | "broadcasts" | "logs" | "general") => {
    const states = {
      accounts: {
        icon: "📱",
        title: "연결된 계정이 없습니다",
        desc: "첫 Telegram 계정을 연결하고 자동화를 시작하세요",
        cta: "계정 연결하기",
        action: () => setActiveTab("register"),
      },
      broadcasts: {
        icon: "✉️",
        title: "발송 내역이 없습니다",
        desc: "AI 채팅이나 발송 탭에서 첫 메시지를 보내보세요",
        cta: "발송하러 가기",
        action: () => setActiveTab("send"),
      },
      logs: {
        icon: "📋",
        title: "로그가 없습니다",
        desc: "발송이 완료되면 여기에 기록이 표시됩니다",
        cta: "처음으로",
        action: () => setActiveTab("dashboard"),
      },
      general: {
        icon: "✨",
        title: "데이터가 없습니다",
        desc: "준비 중입니다",
        cta: "대시보드로",
        action: () => setActiveTab("dashboard"),
      },
    };
    return states[context] || states.general;
  }, [setActiveTab]);

  return { getEmptyState };
}
